const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const url = require('url')

// Check if path is file
function Is_File(path) {
    if (fs.existsSync(path) && fs.lstatSync(path).isFile()) {
        return true;
    } else {
        return false;
    }
}

// Set fullscreen
function Set_Fullscreen(set_val) {
    if (set_val) {
        win.setFullScreen(true)
        win.setMenuBarVisibility(false)
        win.webContents.send('Set_Fullscreen', true)
    } else {
        win.setFullScreen(false)
        win.setMenuBarVisibility(true)
        win.webContents.send('Set_Fullscreen', false)
    }
}

// Toggle fullscreen
function Toggle_Fullscreen(win) {
    if (win.isFullScreen()) {
        Set_Fullscreen(false)
    } else {
        Set_Fullscreen(true)
    }
}

// Start the program when app is ready
app.on('ready', function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        show: false, // Show and maximize later
        icon: path.join(__dirname, 'assets', 'icons', 'main_icon.png'),
        resizable: true,
        webPreferences: {
            nodeIntegration: true
        }
    })

    // Load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src', 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Create the menu
    const menu = Menu.buildFromTemplate([{
            label: 'File',
            submenu: [{
                    // Open dialog
                    label: 'Open',
                    accelerator: 'Ctrl+o',
                    click() {
                        dialog.showOpenDialog({
                            title: "Open",
                        }).then((result) => {
                            file_paths = result.filePaths
                            if (Is_File(file_paths[0])) {
                                win.webContents.send("Open", file_paths[0])
                            }
                        })
                    }
                },
                {
                    // Quit
                    label: 'Quit',
                    accelerator: 'ctrl+q',
                    click() {
                        win.close()
                    }
                },
            ]
        },
        {
            label: 'Navigate',
            // Options to navigate
            submenu: [{
                    label: 'Next Page',
                    click() { win.webContents.send('Next_Page') },
                    accelerator: 'Right'
                },
                {
                    label: 'Previous Page',
                    click() { win.webContents.send('Previous_Page') },
                    accelerator: 'Left'
                },
                {
                    label: 'Back',
                    click() { win.webContents.send('Back') },
                    accelerator: 'Ctrl+Z'
                },
            ]
        },
        {
            label: 'Appearance',
            // View options
            submenu: [{
                    label: 'Font Size',
                    submenu: [{
                            label: 'Increase',
                            click() { win.webContents.send('Increase_Font_Size') },
                            accelerator: 'Ctrl+Plus'
                        },
                        {
                            label: 'Decrease',
                            click() { win.webContents.send('Decrease_Font_Size') },
                            accelerator: 'Ctrl+-'
                        },
                        {
                            label: 'Reset',
                            click() { win.webContents.send('Reset_Font_Size') },
                            accelerator: 'Ctrl+R'
                        },
                    ]
                },
                {
                    label: 'Theme',
                    // Theme options
                    submenu: [{
                            label: 'Light',
                            click() { win.webContents.send('Theme_Light') },
                            type: "radio",
                        },
                        {
                            label: 'Dark',
                            click() { win.webContents.send('Theme_Dark') },
                            type: "radio",
                        },
                        {
                            label: 'Sepia',
                            click() { win.webContents.send('Theme_Sepia') },
                            type: "radio",
                        },
                    ]
                },
                {
                    label: 'Force Single Page',
                    id: 'Force_Single_Page',
                    click() {
                        win.webContents.send('Toggle_Single_Page')
                    },
                    type: "checkbox",
                    accelerator: 'Ctrl+1'
                },
                {
                    label: 'Toggle Fullscreen',
                    click() { Toggle_Fullscreen(win) },
                    accelerator: 'F11'
                },
                {
                    label: 'Exit Fullscreen',
                    click() { Set_Fullscreen(false) },
                    accelerator: 'Esc'
                },
            ]
        },
        {
            label: 'Help',
            // Allow opening browser dev tool
            submenu: [{
                    label: 'DevTool',
                    accelerator: 'Ctrl+D',
                    click() {
                        win.webContents.toggleDevTools()
                    }
                },
                {
                    label: app.name + ' version ' + app.getVersion(),
                }
            ]
        }
    ])

    // Set menu
    Menu.setApplicationMenu(menu)

    // Perform actions after window is loaded
    win.webContents.on('did-finish-load', () => {

        // Handle loading of file when opened with electron
        let path_arg = process.argv[1]
        if (Is_File(path_arg)) {
            win.webContents.send("Open", path_arg)
        }

        // Show and maximize
        win.maximize()
    })

    // Handle toggle single page response
    ipcMain.on('Toggle_Single_Page', (e, state) => {
        menu.getMenuItemById('Force_Single_Page').checked = state
    })

    // Handle toggle fullscreen
    ipcMain.on('Toggle_Fullscreen', (e) => {
        Toggle_Fullscreen(win)
    })
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})