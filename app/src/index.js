const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default

var book = ePub(path.join(__dirname, "../../temp/1.epub"));
var rendition = book.renderTo("area", { width: 600, height: 400 });
var displayed = rendition.display();