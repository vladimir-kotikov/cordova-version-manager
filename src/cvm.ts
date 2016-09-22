
import * as fs from "fs";
import * as tar from "tar";
import ora = require("ora");
import * as path from "path";
import * as zlib from "zlib";
import * as semver from "semver";
import * as rimraf from "rimraf";

import { npm } from "./npm-wrapper";
import { CvmConfig } from "./cvm-config";

export class Cvm {
    private config: CvmConfig;

    constructor() {
        this.config = CvmConfig.getDefault();
    }

    private isInstalled(version: string): boolean {
        return this.list().indexOf(version) >= 0;
    }

    private getVersionDir(version: string): string {
        return path.resolve(this.config.root, version);
    }

    /**
     * Reads location where global cordova installation is linked to.
     * Returns either absolute path to cordova distribution directory or null.
     *
     * @private
     * @returns {Promise<string>} Location which global cordova is linked to
     */
    private async readGlobalLink(): Promise<string> {
        let result = null;
        let npmRoot = await npm.getConfig("prefix");

        try {
            result = fs.realpathSync(path.join(npmRoot, "node_modules/cordova"));
        } catch (e) { }

        return result;
    }

    public async current(): Promise<string> {
        let globalLink = await this.readGlobalLink();
        if (!globalLink) return null;

        let version = path.relative(this.config.root, globalLink);
        if (this.isInstalled(version))
            return version;

        return null;
    }

    public list(): string[] {
        if (!fs.existsSync(this.config.root)) {
            return [];
        }

        return fs.readdirSync(this.config.root)
        .filter(f => fs.statSync(path.join(this.config.root, f)).isDirectory());
    }

    public async available(): Promise<string[]> {
        return (await npm.info("cordova"))["versions"];
    }

    public async install (version: string): Promise<void> {
        validateVersion(version);

        if (this.isInstalled(version)) {
            throw `cordova@${version} is already installed`;
        }

        let availableVersions = await this.available();
        if (availableVersions.indexOf(version) < 0) {
            throw `cordova@${version} does not exist`;
        }

        let spinner = ora(`Fetching cordova ${version}`);
        spinner.start();
        let cachedLocation = await npm.cacheAdd(`cordova@${version}`);

        spinner.text = "Unpacking cordova to cvm root";
        let installDir = path.join(this.config.root, version);
        await unTgz(path.join(cachedLocation, "package.tgz"), installDir);

        spinner.text = "Installing downloaded cordova distribution";
        await npm.at(installDir).install();

        spinner.stop();
    }

    public async uninstall (version: string): Promise<void> {
        validateVersion(version);

        if (!this.isInstalled(version)) {
            throw `cordova@${version} is not installed`;
        }

        let currentVersion = await this.current();
        if (version === currentVersion) {
            await this.off();
        }

        let spinner = ora(`Removing installed cordova ${version}`);
        spinner.start();
        // simply remove directory as we've ensured that there
        // is no link to it from global install directory
        await rmrf(this.getVersionDir(version));
        spinner.stop();
    }

    public async on() {
        if (await this.current()) {
            throw "Already on";
        }

        let installed = this.list();
        if (installed.length === 0) {
            throw "no versions installed. Install at least one version first";
        }

        let spinner = ora("Checking system cordova installation");
        spinner.start();

        let currentSystem = await this.readGlobalLink();

        // If there is an existing link, we need to save it before replacing w/ our
        if (currentSystem) {
            this.config.system = currentSystem;
            this.config.save();
        }

        let versionToUse = this.config.lastUsed;
        if (!versionToUse) {
            // TODO: warn logging here
            versionToUse = installed[installed.length - 1];
        }

        spinner.stop();
        await this.use(versionToUse);
    }

    public async off() {
        let current = await this.current();
        if (!current) {
            throw "Already off";
        }

        let spinner = ora(`Removing global link to cordova ${current}`);
        spinner.start();

        await npm.uninstall("cordova", { global: true });

        // TODO: here we should check .cvmrc for previous installation of cordova
        // and run npm link to link it back again
        if (this.config.system) {
            spinner.text = "Linking system cordova version globally";
            await npm.at(this.config.system).link();
        }

        spinner.stop();
    }

    public async use(version: string): Promise<void> {
        let spinner = ora({});
        spinner.start();

        validateVersion(version);

        if (!this.isInstalled(version)) {
            throw `cordova@${version} is not installed`;
        }

        spinner.text = `Linking cordova ${version} to global package location`;
        await npm.at(this.getVersionDir(version)).link();

        spinner.stop();

        this.config.lastUsed = version;
        this.config.save();
    }
}

function validateVersion(version: string) {
    if (!semver.valid(version, /*loose=*/true)) {
        throw `Version ${version} is not valid version identifier`;
    }
}

async function unTgz(sourceTgz: string, destinationDir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(sourceTgz)
        .pipe(zlib.createGunzip())
        .pipe(tar.Extract({
            path: destinationDir,
            strip: 1
        }))
        .on("end", resolve)
        .on("error", reject);
    });
}

async function rmrf(pattern: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        rimraf(pattern, (err?: Error) => {
            if (err) reject(err);
            else resolve();
        });
    });
}
