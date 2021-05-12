'use babel';

const CodeMirror = require('./codemirror');

export default class FramepilerView {

  constructor({editorData, plantUmlUrl, currentlanguage}) {
    this.editorData = editorData;
    this.plantUmlUrl = plantUmlUrl;
    this.currentlanguage = currentlanguage;
    this.element = document.createElement('div');
    this.element.classList.add('framepiler');
    // If we have UML target, show image with the help of given URL
    if (this.plantUmlUrl) {
      const img = document.createElement('img');
      img.style.height = '100%';
      img.style.width = 'auto';
      img.src = this.plantUmlUrl;
      this.element.appendChild(img);
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
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'framepiler/FramepilerView',
      editorData: this.editorData,
      plantUmlUrl: this.plantUmlUrl,
      currentlanguage: this.currentlanguage
    };
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  };

  getTitle = () => `Framepiler (${this.currentlanguage})`;

  getURI = () => `framepiler://editor`;

  getDefaultLocation = () => 'right';
}
