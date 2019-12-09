const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default

// Update page display
function updatePage(current, total) {
    document.getElementById('page_number').textContent = current + '/' + total
}

// Create object to handle file
class FileClass {

    constructor() {
        this.opened = false
        this.dir = undefined
        this.name = undefined
    }

    // Get the file path
    get path() {
        if (this.opened) {
            return path.join(this.dir, this.name)
        }
    }

    // Open file and store data
    open(filePath) {
        if (filePath === undefined) {
            return
        }
        this.opened = true
        this.dir = path.dirname(filePath)
        this.name = path.basename(filePath)
        document.getElementById('title').innerHTML = this.name

        // Display the book
        Book.load(filePath)
    }
}
var File = new FileClass

// Create object to handle book
class BookClass {

    constructor() {
        this.data = undefined
        this.rendition = undefined
        this.pages = undefined
    }

    // To-do: find a way to get current page
    get currentPage() {
        if (this.rendition !== undefined) {
            return 0
        } else {
            return 0
        }
    }

    load(filePath) {
        this.data = ePub(filePath)
        this.data.ready.then(() => {
            this.pages = this.data.pageList.lastPage
            this.display()
        })
    }

    display() {
        this.rendition = this.data.renderTo("book_cont");
        var displayed = this.rendition.display();
        updatePage(this.currentPage, this.pages)
    }

    nextPage() {
        if (this.rendition !== undefined) {
            this.rendition.next()
            updatePage(this.currentPage, this.pages)
        }
    }

    previousPage() {
        if (this.rendition !== undefined) {
            this.rendition.prev()
            updatePage(this.currentPage, this.pages)
        }
    }
}
var Book = new BookClass


// Handle main process events
ipcRenderer.on("Open", (e, filePath) => {
    File.open(filePath)
})
ipcRenderer.on("Next_Page", (e) => {
    Book.nextPage()
})
ipcRenderer.on("Previous_Page", (e) => {
    Book.previousPage()
})