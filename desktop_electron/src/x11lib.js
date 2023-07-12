// import bindings from 'bindings';
// export const screenshot = bindings('screenshot');
// export const converter = bindings('converter');
// export const xtest = bindings('xtest');


//const nodePath = path.dirname(__dirname) + '/build/Release/.node';

const path = require('path'); 
const screenshotPath = path.join(__dirname, '../build/Release/screenshot.node');
export const screenshot = __non_webpack_require__(screenshotPath);

const converterPath = path.join(__dirname, '../build/Release/converter.node');
export const converter = __non_webpack_require__(converterPath);

const xtestPath = path.join(__dirname, '../build/Release/xtest.node');
export const xtest = __non_webpack_require__(xtestPath);