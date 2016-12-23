
import { Cvm } from "./cvm";
import { docopt } from "docopt";

let USAGE = `
Usage:
    cvm (ls | list) [available]
    cvm (install | uninstall | use) <version> [--verbose | -v]
    cvm (on | off)
    cvm -h | --help
    cvm --version
`;

let options = docopt(USAGE, {
    version: require("../package.json").version
});

let cvm = new Cvm();

let logErrorAndExit = (err: any) => {
    console.error(err);
    process.exit(2);
};

let success = () => process.exit(0);

if (options.ls || options.list) {
    if (options.available) {
        cvm.available()
        .then((v) => {
            console.log(v.map(v => "    " + v).join("\n"));
        })
        .then(success)
        .catch(logErrorAndExit);
    } else {
        cvm.current()
        .then(currentVersion => {
            let versions = cvm.list()
                .map(v => (v === currentVersion ? "  * " : "    ") + v)
                .join("\n");

            console.log(`Installed versions:\n` + versions);
        })
        .then(success)
        .catch(logErrorAndExit);
    }
}

if (options.install) {
    const version = options["<version>"];
    cvm.fetch(version)
    .then(version => cvm.use(version))
    .then(success)
    .catch(logErrorAndExit);
}

if (options.uninstall) {
    const version = options["<version>"];
    cvm.uninstall(version)
    .then(success)
    .catch(logErrorAndExit);
}

if (options.use) {
    const version = options["<version>"];
    cvm.use(version)
    .then(success)
    .catch(logErrorAndExit);
}

if (options.on || options.off) {
    (options.on ? cvm.on() : cvm.off())
    .then(success)
    .catch(logErrorAndExit);
}
