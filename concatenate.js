const fs = require('fs-extra');
const concat = require('concat');

concatenate = async () =>{
    const files = [
        './dist/ecl-builder/runtime.js',
        './dist/ecl-builder/polyfills.js',
        './dist/ecl-builder/scripts.js',
        './dist/ecl-builder/main.js'
    ];

    await fs.ensureDir('output');
    await concat(files, 'output/ecl-builder.js');
    // await fs.copyFile('./dist/ecl-builder-ui/styles.css', 'output/styles.css');
    // await fs.copy('./dist/ecl-builder-ui/assets/', 'output/assets/');
}
concatenate();
