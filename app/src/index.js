const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default

// Handle main process events
ipcRenderer.on("Open", (e, file_path) => {
    var book = ePub(file_path);
    var rendition = book.renderTo("area", { width: 600, height: 400 });
    var displayed = rendition.display();
})