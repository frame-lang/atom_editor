'use babel';

const CodeMirror = require('../media/js/codemirror');
import { normalize } from 'path';

export default class FrameMachineMakerView {

  constructor({editorData, plantUmlUrl, currentlanguage}) {
    this.editorData = editorData;
    this.plantUmlUrl = plantUmlUrl;
    this.currentlanguage = currentlanguage;
    this.element = document.createElement('div');
    this.element.classList.add('frame-machine-maker');

    // For empty Frame file show a webpage instead
    if (!this.editorData) {
      this.element.innerHTML = '<object data="https://frame-lang.org/frame-machine-maker-atom.html"/>'
      return;
    }

    // If we have UML target, show image with the help of given URL
    if (this.currentlanguage === 'plantuml') {
      if (!this.plantUmlUrl) { // If we have UML target, but URL is empty show nothing
        return;
      }
      const plantUmlData = this.getUMLView();
      this.element.appendChild(plantUmlData);
      return;
    }
    // Generate a Code Mirror instance to show code which is read only
    const targetEditor = CodeMirror(this.element, {
      lineNumbers: true,
      value: '',
      mode:  'text',
      readOnly: true
    });
    targetEditor.setValue(this.editorData);
    setTimeout(function() {
      targetEditor.refresh();
    },100);

    const codeMirrorData = this.getCodeMirrorView(targetEditor);
    this.element.appendChild(codeMirrorData);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'frame-machine-maker/FrameMachineMakerView',
      editorData: this.editorData,
      plantUmlUrl: this.plantUmlUrl,
      currentlanguage: this.currentlanguage
    };
  }

  getUMLView = () => {
    const containerDiv = document.createElement('div');

    // Add font awesome
    const fontAwesomePath = normalize(`${__dirname}/../media/css/font-awesome.min.css`);
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = fontAwesomePath;
    containerDiv.appendChild(fontAwesome);

    // Add image in div
    const imgDiv = document.createElement('div');
    imgDiv.className = 'copyable';
    const img = document.createElement('img');
    img.src = this.plantUmlUrl;
    containerDiv.style.overflow = 'auto';
    imgDiv.appendChild(img);
    containerDiv.appendChild(imgDiv);

    // Add copy button and onclick functionality
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.onclick = () => {
      this.copyImageToCipboard();
    };
    Object.assign(copyButton.style, {
      'margin-top': '40px',
      'margin-right': '20px',
      'position': 'fixed',
      'top': 0,
      'right': 0,
      'z-index': 999
    });

    // Add font awesome icon in button tag
    const iTag = document.createElement('i');
    iTag.className = 'fas fa-copy';
    copyButton.appendChild(iTag);
    containerDiv.appendChild(copyButton);
    return containerDiv;
  }

  copyImageToCipboard = () => {
    //Make the container Div contenteditable
    const x = document.getElementsByClassName('copyable')[0];
    x.setAttribute('contenteditable', true);
    //Select the image
    this.selectImage(x);
    //Execute copy Command
    //Note: This will ONLY work directly inside a click listenner
    document.execCommand('copy');
    //Unselect the content
    window.getSelection().removeAllRanges();
    //Make the container Div uneditable again
    x.removeAttribute('contenteditable')
  }

  selectImage = (element) => {
    const doc = document;
    if (doc.body.createTextRange) {
      const range = document.body.createTextRange();
      range.moveToElementText(element);
      range.select();
    } else if (window.getSelection) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  getCodeMirrorView = (codeMirror) => {
    const containerDiv = document.createElement('div');

    // Add font awesome
    const fontAwesomePath = normalize(`${__dirname}/../media/css/font-awesome.min.css`);
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = fontAwesomePath;
    containerDiv.appendChild(fontAwesome);

    // Add ClipboardJS
    const clipboardJSPath = normalize(`${__dirname}/../media/js/clipboard.min.js`);
    const clipboardJS = document.createElement('script');
    clipboardJS.setAttribute('src', clipboardJSPath);
    containerDiv.appendChild(clipboardJS);

    // Add copy button and onclick functionality
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-output';
    Object.assign(copyButton.style, {
      'margin-top': '40px',
      'margin-right': '20px',
      'position': 'fixed',
      'top': 0,
      'right': 0,
      'z-index': 999
    });

    // Add font awesome icon in button tag
    const iTag = document.createElement('i');
    iTag.className = 'fas fa-copy';
    copyButton.appendChild(iTag);
    containerDiv.appendChild(copyButton);

    // Add clipboard functionality on button with copy-output class
    clipboardJS.onload = () => {
      new Clipboard('.copy-output', {
        text: (trigger) => codeMirror.getValue()
      });
    }
    return containerDiv;
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  };

  getTitle = () => this.editorData ? `Frame Machine Maker (${this.currentlanguage})` : 'Frame Machine Maker';

  getURI = () => `frame-machine-maker://editor`;
}



