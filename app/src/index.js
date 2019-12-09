const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default

// Create object to handle file
class File_C {

    constructor() {
        this.Opened = false
        this.Name = undefined
    }

    // Get the file path
    get Path() {
        if (this.Opened) {
            return path.join(this.Dir, this.Name)
        }
    }

    // Open file and store data
    Open(file_path) {
        if (file_path === undefined) {
            return
        }
        this.Opened = true
        this.Name = path.basename(file_path)
        document.getElementById('title').innerHTML = this.Name

        // Display the book
        Book.Load(file_path)
    }
}
var File = new File_C

// Create object to handle book
class Book_C {

    constructor() {
        this.Data = undefined
    }

    Load(file_path) {
        this.Data = ePub(file_path)
        this.Display()
    }

    Display() {
        var rendition = this.Data.renderTo("area", { width: 600, height: 400 });
        var displayed = rendition.display();
    }
}
var Book = new Book_C


// Handle main process events
ipcRenderer.on("Open", (e, file_path) => {
    File.Open(file_path)
})