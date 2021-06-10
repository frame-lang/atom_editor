## 0.3.0 - Write framepiled files on disk and Copy functionality
* When framepiling any file, framepiled file will save on disk at same folder as source file with appropriate extension.
* Added a Copy button on Machine Maker view. With the help of that, we can copy both image and code.
* Bug fixed: Switching to a non-frame file permanently removes MM tab 

## 0.2.0 - Integrate new transpiler version
* Updated framec executable version to v0.4.0 for all platforms
* Added Rust as a target language 

## 0.1.5 - Handle opening Frame Machine Maker window
* If we manually close the window then while saving or switch to another tab window should not open.
* Added new webpage for Empty Frame Spec files

## 0.1.4 - Rename package name
* Rename package name to **frame-machine-maker**

## 0.1.3 - Fixed known bugs
* Bug fixed: When we are on Settings tab and Framepile it gived error in console.
* If Frame Machine Maker tab is opened and we move to Settings tab Frame Machine Maker is still visible.
* Handle Empty UML case
* Handle Error with Frame Spec other than "Terminating with errors"
* In case of empty Frame Spec File show Frame Webpage instead

## 0.1.2 - Updated README
* Update README.md file
* Display Error deatils when error while loading UML

## 0.1.1 - Reload Frame Machine Maker
* UML image display improved
* Frame Machine Maker tab display on half of the screen
* Reload Frame Machine Maker tab according to latest editor opened
* Close Framepler for non Frame Spec files

## 0.1.0 - First Release
* Added Basic functionality of Frame Machine Maker
* Display Framepile option in Packages menu and Context menu (Right click of mouse on editor)
* Open a pane/window if we framepile a Frame Specification file
* Error handling: Close preview pane and display error notification
  * Unsaved file
  * Not a Frame specification file
  * Error while Frampiling
  * Terminating with errors (Error in Frame Spec)
  * Error while loading UML
* Added framec module for linux
* Call Plant UML for displaying UML diagrams
* Restore preview on Refresh/Reload
* Reload on save once we Framepile a Frame Spec
* Added Key mappings
  * ctrl-alt-u: Framepile to UML
  * ctrl-alt-n: Framepile to next target available
  * ctrl-alt-p: Framepile to previous target available
