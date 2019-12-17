const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default

// Update page display
function updateLocation(percent) {
    percent = Math.round(percent * 100) / 100;
    document.getElementById('location').textContent = percent + '/100'
    Slider.seek(percent)
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
        this.singlePage = false
        this.fontSize = 100
        this.generated = false
        this.coverLocation = undefined
    }

    load(filePath) {
        this.data = ePub(filePath)
        this.data.ready.then(() => {
            // Don't wait for generation to display
            this.display()
        })
    }

    display() {
        this.rendition = this.data.renderTo("book_cont");
        this.rendition.display().then(() => {

            // Store the 1st page location
            this.coverLocation = this.rendition.currentLocation().start.cfi

            // generate locations
            this.data.locations.generate().then(() => {
                this.generated = true;
                updateLocation(Book.currentPercent)
            })

            // Handle drag and drop of files on the iframe
            document.getElementsByTagName('iframe')[0].contentWindow.addEventListener('dragover', (e) => {
                e.preventDefault();
            })
            document.getElementsByTagName('iframe')[0].contentWindow.addEventListener('drop', (e) => {
                e.preventDefault();
                let file_path = e.dataTransfer.files[0].path
                File.open(file_path)
            })
        })
    }

    // Get current page in percent
    get currentPercent() {
        if (this.generated) {
            let currentLocation = this.rendition.currentLocation().start.cfi
            let currentPercent = this.data.locations.percentageFromCfi(currentLocation) * 100
            return currentPercent
        } else {
            return 0
        }
    }

    goTo(percent) {
        if (!this.generated) {
            return
        }
        let location
        if (percent == 0) {
            location = this.coverLocation
        } else {
            location = this.data.locations.cfiFromPercentage(percent / 100)
        }
        this.rendition.display(location)
        updateLocation(percent)
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

    nextPage() {
        if (this.rendition !== undefined) {
            this.rendition.next().then(() => {
                updateLocation(this.currentPercent)
            })
        }
    }

    previousPage() {
        if (this.rendition !== undefined) {
            this.rendition.prev().then(() => {
                updateLocation(this.currentPercent)
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

class SliderClass {

    constructor() {
        this.Elem = document.getElementById('slider')
        this.seek(0)
        this.Elem.addEventListener('focus', () => {
            this.Elem.blur() // Prevent focus that takes keybaord input
        })
        this.Elem.addEventListener('input', () => {
            if (!Book.generated) {
                this.seek(0)
            }
            Book.goTo(this.Elem.value)
        })
    }

    seek(percent) {
        // Limit val between 0 and 1
        percent = percent < 0 ? 0 : percent > 100 ? 100 : percent
        percent = Math.round(percent * 100) / 100
        this.Elem.style.setProperty('background', 'linear-gradient(to right, red ' + percent + '%, black ' + percent + '%')
        this.Elem.value = percent
    }
}
var Slider = new SliderClass

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
    ipcRenderer.send("Toggle_Single_Page", Book.singlePage)
})

// Add button shortcuts
document.getElementById('decrease_font_size').addEventListener('click', (e) => {
    Book.incrementFontSize(-10)
})
document.getElementById('increase_font_size').addEventListener('click', (e) => {
    Book.incrementFontSize(10)
})
document.getElementById('single_page').addEventListener('click', (e) => {
    Book.toggleSinglePage()
    ipcRenderer.send("Toggle_Single_Page", Book.singlePage)
})
document.getElementById('fullscreen').addEventListener('click', (e) => {
    ipcRenderer.send('Toggle_Fullscreen')
})