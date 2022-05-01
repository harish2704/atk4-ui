const fs = require('fs');
const https = require('https');
const path = require('path');

const walkFilesSync = function (f, callback) {
    if (fs.lstatSync(f).isDirectory()) {
        return fs.readdirSync(f).sort().flatMap((f2) => walkFilesSync(path.join(f, f2), callback));
    }

    return [callback(f)];
};

const updateFileSync = function (f, callback) {
    const dataOrig = fs.readFileSync(f, 'binary');
    const dataNew = callback(dataOrig);
    if (dataNew !== undefined && dataNew !== dataOrig) {
        fs.writeFileSync(f, dataNew, { encoding: 'binary' });
    }
};

// move node_modules/ files to parent directory
if (fs.existsSync(path.join(__dirname, 'node_modules/jquery'))) {
    fs.readdirSync(path.join(__dirname, 'node_modules')).forEach((f2) => {
        fs.renameSync(
            path.join(path.join(__dirname, 'node_modules'), f2),
            path.join(__dirname, f2),
        );
    });
    fs.rmdirSync(path.join(__dirname, 'node_modules'));
}

// copy non-minified JS to make it available from the same directory as the minified version
if (fs.existsSync(path.join(__dirname, 'form-serializer/jquery.serialize-object.js'))) {
    fs.renameSync(
        path.join(__dirname, 'form-serializer/jquery.serialize-object.js'),
        path.join(__dirname, 'form-serializer/dist/jquery.serialize-object.js'),
    );
}

// download Fomantic-UI license
// remove once https://github.com/fomantic/Fomantic-UI/issues/2356 is fixed and v2.9.0 is released
https.get(
    'https://raw.githubusercontent.com/fomantic/Fomantic-UI/2.8.8/LICENSE.md',
    (response) => response.pipe(fs.createWriteStream(path.join(__dirname, 'fomantic-ui-css/LICENSE.md'))),
);

const cssUrlPattern = '((?<!\\w)url\\([\'"]?(?!data:))((?:[^(){}\\\\\'"]|\\\\.)*)([\'"]?\\))';

// remove links to fonts with format other than woff2 from Fomantic-UI
walkFilesSync(path.join(__dirname, 'fomantic-ui-css'), (f) => {
    updateFileSync(f, (data) => {
        if (!f.endsWith('.css')) {
            return;
        }

        data = data.replace(new RegExp('src:\\s*(?=[^{};,]+\\.eot(?!\\w))' + cssUrlPattern + ';\\s*', 'g'), '');
        data = data.replace(new RegExp('(src:\\s*(?!\\s))[^{};]*((?=[^{};,]+\\.woff2(?!\\w))' + cssUrlPattern + ')[^{};]*(;)', 'g'), '$1$2 format(\'woff2\')$6');

        return data;
    });
});

// remove twemoji images from Fomantic-UI, reduce total size by about 3500 files and 25 MB
// wait until https://github.com/fomantic/Fomantic-UI/issues/2363 is implemented or pack all images in one phar
walkFilesSync(path.join(__dirname, 'fomantic-ui-css'), (f) => {
    updateFileSync(f, (data) => {
        if (!f.endsWith('.css')) {
            return;
        }

        data = data.replace(/\s*((?<!\w)em\[data-emoji=[^[\]{}\\]+\]:before,?\s*)+\{[^{}]*background-image:[^{}]+\}/g, '');

        return data;
    });
});

// replace absolute URLs with relative paths
walkFilesSync(__dirname, (f) => {
    updateFileSync(f, (data) => {
        if (!f.endsWith('.css')) {
            return;
        }

        data = data.replace(new RegExp(cssUrlPattern, 'g'), (m, m1, m2, m3) => {
            if (m2.startsWith('https://fonts.googleapis.com/css2?family=Lato:')) {
                return m;
            }

            let pathRel = null;
            if (m2.startsWith('http://') || m2.startsWith('https://') || m2.startsWith('//')) {
                const pathMap = {
                    'https://twemoji.maxcdn.com/v/latest/svg/': path.join(__dirname, 'twemoji/assets/svg/'),
                };

                const pathMapKeys = Object.keys(pathMap);
                for (let i = 0; i < pathMapKeys.length; i++) {
                    const k = pathMapKeys[i];
                    if (m2.startsWith(k)) {
                        const kRel = m2.substring(k.length);
                        const pathLocal = path.join(pathMap[k], kRel);
                        pathRel = path.relative(path.dirname(f), pathLocal);

                        break;
                    }
                }

                if (pathRel === null) {
                    throw new Error('URL "' + m2 + '" has no local file mapping');
                }
            } else {
                pathRel = m2;
            }

            pathRel = pathRel.replaceAll('\\', '/');
            if (!pathRel.startsWith('.')) {
                pathRel = './' + pathRel;
            }

            if (!fs.existsSync(path.join(path.dirname(f), pathRel))) {
                throw new Error('File "' + pathRel + '" linked from "' + f + '" does not exist');
            }

            return m1 + pathRel + m3;
        });

        return data;
    });
});

// normalize EOL of text files
walkFilesSync(__dirname, (f) => {
    updateFileSync(f, (data) => {
        if (data.includes('\0') || f.match(/\.min\./)) {
            return;
        }

        data = data.replace(/\r?\n|\r/g, '\n');
        if (data.slice(-1) !== '\n') {
            data += '\n';
        }

        return data;
    });
});
