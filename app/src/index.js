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

        if (Book.data) {
            Book.data.destroy()
        }
        Book = new BookClass
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
        this.singlePage = false
        this.fontSize = 100
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

    setSinglePage(setVal) {
        if (this.rendition === undefined) {
            return
        }
        if (setVal) {
            this.rendition.spread("none")
            this.singlePage = true
        } else {
            this.rendition.spread("auto")
            this.singlePage = false
        }
    }

    toggleSinglePage() {
        if (this.singlePage) {
            this.setSinglePage(false)
        } else {
            this.setSinglePage(true)
        }
    }

    display() {
        this.rendition = this.data.renderTo("book_cont");
        this.rendition.display().then(() => {

            // Handle drag and drop of files on the iframe
            document.getElementsByTagName('iframe')[0].contentWindow.addEventListener('dragover', (e) => {
                e.preventDefault();
            })
            document.getElementsByTagName('iframe')[0].contentWindow.addEventListener('drop', (e) => {
                e.preventDefault();
                let file_path = e.dataTransfer.files[0].path
                File.open(file_path)
            })

            updatePage(this.currentPage, this.pages)
        })
    }

    nextPage() {
        if (this.rendition !== undefined) {
            this.rendition.next().then(() => {
                updatePage(this.currentPage, this.pages)
            })
        }
    }

    previousPage() {
        if (this.rendition !== undefined) {
            this.rendition.prev().then(() => {
                updatePage(this.currentPage, this.pages)
            })
        }
    }

    incrementFontSize(increment) {
        this.fontSize += increment
        if (this.fontSize < 1) {
            this.fontSize = 1;
        }
        this.rendition.themes.fontSize(this.fontSize + "%")
    }

    resetFontSize() {
        this.fontSize = 100
        this.rendition.themes.fontSize(this.fontSize + "%")
    }
}
var Book = new BookClass

// Handle drag and drop on main window
document.addEventListener('dragover', (e) => {
    e.preventDefault();
})
document.addEventListener('drop', (e) => {
    e.preventDefault();
    let file_path = e.dataTransfer.files[0].path
    File.open(file_path)
})

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
ipcRenderer.on("Increase_Font_Size", (e) => {
    Book.incrementFontSize(10)
})
ipcRenderer.on("Decrease_Font_Size", (e) => {
    Book.incrementFontSize(-10)
})
ipcRenderer.on("Reset_Font_Size", (e) => {
    Book.resetFontSize()
})
ipcRenderer.on("Toggle_Single_Page", (e) => {
    Book.toggleSinglePage()
})