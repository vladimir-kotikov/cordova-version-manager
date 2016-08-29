
import * as child_process from "child_process";

let NPM: string = "npm";

async function spawn(command: string, args: string[], cwd: string = process.cwd()): Promise<string> {
    let output = "";
    let stderr = "";

    return new Promise<string>((resolve, reject) => {
        let proc = child_process
        .spawn(command, args, {
            cwd: cwd,
            stdio: "pipe",
            shell: true
        });

        proc.on("exit", code => {
            if (!code) resolve(output);
            else reject(stderr);
        })
        .on("error", reject);

        proc.stdout.on("data", data => {
            output += data.toString();
        });

        proc.stderr.on("data", data => {
            stderr += data.toString();
            output += data.toString();
        });
    });
}

export class NpmOpts {
    global: boolean = false;
}

class Npm {
    private cwd: string = process.cwd();

    public at(path: string): Npm {
        this.cwd = path;
        return this;
    }

    public async info(packageName: string): Promise<Object> {
        let npmInfo = await spawn(NPM, ["info", packageName, "--json"]);
        return Promise.resolve(JSON.parse(npmInfo.trim()));
    }

    public async getConfig(key: string): Promise<string> {
        return (await spawn(NPM, ["config", "get", key])).trim();
    }

    public async cacheAdd(packageName: string): Promise<string> {
        const output = await spawn(NPM, ["cache", "add", packageName, "--verbose"]);
        return /npm verb afterAdd (.*)[\\/]package[\\/]package.json written/gi.exec(output)[1];
    }

    public async install(packageName?: string): Promise<void> {
        let npmArgs = ["install", "--prod"];
        if (packageName) npmArgs.push(packageName);

        await spawn(NPM, npmArgs, this.cwd);
    }

    public async uninstall(packageName: string, options: NpmOpts = new NpmOpts()): Promise<void> {

        let npmArgs = ["uninstall", packageName];
        if (options.global) {
            npmArgs.push("--global");
        }

        await spawn(NPM, npmArgs, this.cwd);
    }

    public async link(packageName?: string): Promise<void> {
        let args = ["link"];
        if (packageName) args.push(packageName);

        await spawn(NPM, args, this.cwd);
    }
}

let wrapper = new Npm();

export { wrapper as npm };
