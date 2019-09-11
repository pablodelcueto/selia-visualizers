class VisualizerBase {
  constructor(config) {
    this.canvas = config.canvas;
    this.itemInfo = config.itemInfo;
    this.active = config.active || true;
    this.activator = config.activator || (() => null);

    this.events = this.getEvents();
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');

    this.adjustSize();
    this.init();

    this.bindEvents();
  }

  getEvents() {
    // abstract method
  }

  init() {
    // abstract method
  }

  draw() {
    // abstract method
  }

  getConfig() {
    // abstract method
  }

  setConfig(configs) {
    // abstract method
  }

  renderToolbar() {
    // abstract method
    // Should return a React component
  }

  canvasToPoint(p) {
    // abstract method
  }

  pointToCanvas(p) {
    // abstract method
  }

  validatePoints(p){
    // abstract method
  }

  emitUpdateEvent() {
    let event = new CustomEvent('visualizer-update')
    let canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => canvas.dispatchEvent(event));
  }

  createPoint(x, y) {
    let p = this.svg.createSVGPoint();
    p.x = x;
    p.y = y;
    return p;
  }

  adjustSize() {
    this.canvas.style.width ='100%';
    this.canvas.style.height='100%';
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }

  toggleActivate() {
    this.active = !this.active;
  }


  getMouseEventPosition(event) {
    let x = event.offsetX || (event.pageX - this.canvas.offsetLeft)
    let y = event.offsetY || (event.pageY - this.canvas.offsetTop)

    return this.createPoint(x, y);
  }

  bindEvents() {
    for (let eventType in this.events) {
      let listeners = this.events[eventType];

      if (!(Array.isArray(listeners))){
        listeners = [listeners];
      }

      listeners.forEach((listener) => {
        this.canvas.addEventListener(eventType, listener, false);
      });
    }
  }

  unmount() {
    for (let eventType in this.events) {
      let listeners = this.events[eventType];

      if (!(Array.isArray(listeners))){
        listeners = [listeners];
      }

      listeners.forEach((listener) => {
        this.canvas.removeEventListener(eventType, listener);
      });
    }
  }
}

export default VisualizerBase;
