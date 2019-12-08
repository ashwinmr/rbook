const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default

// Use the example cpp addon
const example_addon = require('electron').remote.require('./build/Release/example_addon.node')
document.getElementById("hello").innerHTML = example_addon.hello('from cpp');

var book = ePub(path.join(__dirname, "../../temp/1.epub"));
var rendition = book.renderTo("area", { width: 600, height: 400 });
var displayed = rendition.display();