'use babel';

const CodeMirror = require('./codemirror');

export default class FrameMachineMakerView {

  constructor({editorData, plantUmlUrl, currentlanguage}) {
    this.editorData = editorData;
    this.plantUmlUrl = plantUmlUrl;
    this.currentlanguage = currentlanguage;
    this.element = document.createElement('div');
    this.element.classList.add('frame-machine-maker');

    // For empty Frame file show a webpage instead
    if (!this.editorData) {
      this.element.innerHTML = '<object data="https://frame-lang.org/machine-maker"/>'
      return;
    }

    // If we have UML target, show image with the help of given URL
    if (this.currentlanguage === 'PlantUml') {
      if (!this.plantUmlUrl) { // If we have UML target, but URL is empty show nothing
        return;
      }
      const img = document.createElement('img');
      img.src = this.plantUmlUrl;
      this.element.style.overflow = 'auto';
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
      deserializer: 'frame-machine-maker/FrameMachineMakerView',
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

  getTitle = () => this.editorData ? `Frame Machine Maker (${this.currentlanguage})` : 'Frame Machine Maker';

  getURI = () => `frame-machine-maker://editor`;
}
