﻿const { ipcRenderer } = require('electron')
const path = require('path')
const url = require('url')
const ePub = require('epubjs').default
const mousetrap = require('mousetrap') // Can't be used in node. Only in browser

function updateLocationPercent(percent) {
    percent = Math.round(percent * 100) / 100;
    document.getElementById('location').textContent = percent + '/100'
    Slider.seek(percent)
    Book.preventNextLocationUpdate = true
}

// Set Fullscreen
function Set_Fullscreen(set_val) {
    if (set_val) {
        document.getElementById('control_bar').classList.add('hover_show')
        document.getElementById('fullscreen').style.backgroundColor = "red"
    } else {
        document.getElementById('control_bar').classList.remove('hover_show')
        document.getElementById('fullscreen').style.backgroundColor = "black"
    }
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
        this.containerElem = document.getElementById('book_cont')
        this.preventNextLocationUpdate = false
        this.iframeElem = undefined
    }

    load(filePath) {
        this.data = ePub(filePath)
        this.data.ready.then(() => {
            // Don't wait for generation to display
            this.display()
        })
    }

    get currentPercent() {
        if (!this.generated) {
            return 0
        }
        let currentLocation = this.rendition.currentLocation().start.cfi
        let currentPercent = this.data.locations.percentageFromCfi(currentLocation) * 100
        return currentPercent
    }

    addListenersToIframe(iframeElem) {
        // Handle drag and drop on iframe
        iframeElem.addEventListener('dragover', (e) => {
            e.preventDefault();
        })
        iframeElem.addEventListener('drop', (e) => {
            e.preventDefault();
            let file_path = e.dataTransfer.files[0].path
            File.open(file_path)
        })

        // Hangle swipe gesture on iframe
        iframeElem.addEventListener('touchstart', (e) => {
            Interaction.touchStart = e.touches[0].clientX
            Interaction.touchEnd = e.touches[0].clientX
        })
        iframeElem.addEventListener('touchmove', (e) => {
            Interaction.touchEnd = e.touches[0].clientX
        })
        iframeElem.addEventListener('touchend', (e) => {
            let minDist = 25
            if (Interaction.touchStart > Interaction.touchEnd + minDist) {
                Book.nextPage()
            }
            if (Interaction.touchStart < Interaction.touchEnd - minDist) {
                Book.previousPage()
            }
        })
    }

    display() {
        this.rendition = this.data.renderTo("book_cont", {
            "width": this.containerElem.clientWidth,
            "height": this.containerElem.clientHeight
        });

        this.rendition.display().then(() => {

            // Store the 1st page location
            this.coverLocation = this.rendition.currentLocation().start.cfi

            // Handle location change
            this.rendition.on('relocated', () => {
                // Prevent slider jump
                if (this.preventNextLocationUpdate) {
                    this.preventNextLocationUpdate = false
                } else {
                    updateLocationPercent(this.currentPercent)
                }

                let iframeElem = document.getElementsByTagName('iframe')[0].contentWindow
                if (iframeElem != this.iframeElem) {
                    this.addListenersToIframe(iframeElem)
                    this.iframeElem = iframeElem
                }

            })

            // generate locations
            this.data.locations.generate().then(() => {
                this.generated = true;
            })
        })
    }

    resize() {
        if (this.rendition === undefined) {
            return;
        }
        this.rendition.resize(this.containerElem.clientWidth, this.containerElem.clientHeight)
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
        updateLocationPercent(percent)
        this.rendition.display(location)
    }

    setSinglePage(setVal) {
        if (this.rendition === undefined) {
            return
        }
        if (setVal) {
            this.rendition.spread("none")
            this.singlePage = true
            document.getElementById('single_page').style.backgroundColor = "red"
        } else {
            this.rendition.spread("auto")
            this.singlePage = false
            document.getElementById('single_page').style.backgroundColor = "black"
        }
    }

    toggleSinglePage() {
        if (this.singlePage) {
            this.setSinglePage(false)
        } else {
            this.setSinglePage(true)
        }
        ipcRenderer.send("Toggle_Single_Page", this.singlePage)
    }

    nextPage() {
        if (this.rendition !== undefined) {
            this.rendition.next()
        }
    }

    previousPage() {
        if (this.rendition !== undefined) {
            this.rendition.prev()
        }
    }

    incrementFontSize(increment) {
        if (this.rendition === undefined) {
            return
        }
        this.fontSize += increment
        if (this.fontSize < 1) {
            this.fontSize = 1;
        }
        this.rendition.themes.fontSize(this.fontSize + "%")
    }

    resetFontSize() {
        if (this.rendition === undefined) {
            return
        }
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

class InteractionClass {
    constructor() {
        this.touchStart = undefined
        this.touchEnd = undefined
    }
}
var Interaction = new InteractionClass

// Handle resizing of window
window.addEventListener('resize', (e) => { Book.resize() })

// Handle drag and drop on main window
document.addEventListener('dragover', (e) => {
    e.preventDefault();
})
document.addEventListener('drop', (e) => {
    e.preventDefault();
    let file_path = e.dataTransfer.files[0].path
    File.open(file_path)
})

// Add keyboard shortcuts 
mousetrap.bind('ctrl+=', () => {
    Book.incrementFontSize(10)
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
ipcRenderer.on('Set_Fullscreen', (e, set_val) => {
    Set_Fullscreen(set_val)
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
})
document.getElementById('fullscreen').addEventListener('click', (e) => {
    ipcRenderer.send('Toggle_Fullscreen')
})
document.getElementById('previous_page_area').addEventListener('click', (e) => {
    Book.previousPage()
})
document.getElementById('next_page_area').addEventListener('click', (e) => {
    Book.nextPage()
})