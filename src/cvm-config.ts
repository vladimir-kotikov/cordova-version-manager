
import * as fs from "fs";
import * as path from "path";

export class CvmConfig {

    private _config: any = {};
    private cvmrc: string;
    private changed = false;

    public static DEFAULT_ROOT = path.join(process.env.USERPROFILE || process.env.HOME, ".cvm");

    public root: string;
    public verbose: boolean;

    constructor(cvmRoot: string, cvmRc?: string) {
        this.root = cvmRoot;
        this.cvmrc = cvmRc || path.join(cvmRoot, ".cvmrc");

        // Don't fail if config doesn't exist - this is most likely due to fresh CVM setup
        if (!fs.existsSync(this.cvmrc)) {
            this._config = {};
            return this;
        }

        try {
            this._config = JSON.parse(fs.readFileSync(this.cvmrc, "utf8"));
        } catch (e) {
            console.log(`Failed to parse config at ${this.cvmrc}`);
        }
    }

    static getDefault(): CvmConfig {
        return new CvmConfig(CvmConfig.DEFAULT_ROOT);
    }

    public save(): void {
        fs.writeFileSync(this.cvmrc, JSON.stringify(this._config, null, 4));
        this.changed = false;
    }

    public get lastUsed(): string {
        return this._config["lastUsed"];
    }

    public set lastUsed(value: string) {
        this._config["lastUsed"] = value;
        this.changed = true;
    }

    public get system(): string {
        return this._config["system"];
    }
    public set system(value: string) {
        this._config["system"] = value;
        this.changed = true;
    }
}
