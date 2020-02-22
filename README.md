# Selia-Spectrogram-visualizer: 

This repository contains the basic code needed to develop a new visualizer for [Selia/Irekua](https://github.com/CONABIO-audio/irekua).
A visualizer is meant to be a tool to see and explore files of a certain type.

## Commands

### Quick start

To start development fork this repository and install with
```bash
npm install
```
or
```bash
yarn install
```

### Development tools

To start up a development server run
```bash
npm run start
```
The server will automatically reload on any changes to the source code.

### Build final version

To build a production version of your visualizer just run
```bash
npm run build
```
The compiled bundle will be stored in the `dist/` directory.

## Developing a new visualizer

### Code structure

This repository is structured as follows

    project
    │   README.md
    │   package.json
    |   app.js
    |   webpack.config.js
    |   ...
    │
    └───src
    │   │   index.js
    │   │
    │   └─── visualizer
    │       │   index.js
    │       │   ...
    │   
    └───public
        │   index.html
        └───files

The source directory (`src/`) should contain all the code relevant to the visualizer. Any custom code should be placed within
the visualizer directory (`src/visualizer/`).

The public  directory (`public/`) contains a simple page for testing the developed visualizer. A single file should be placed
within the files directory (`public/files/`) to serve as a test file for the visualizer.

### Starting development

The visualizer should be a single class that inherits from the class `VisualizerBase` contained in the package `@selia/visualizer`
and exported as default by the file `src/visualizer/index.js`.

Hence any `src/visualizer/index.js` file should have this structure:

```javascript
import VisualizerBase from '@selia/visualizer';

class MyVisualizer extends VisualizerBase {
  // Custom code
  // ...
}

export default MyVisualizer
```

To consult the code for the base class check out its [repository](https://github.com/mbsantiago/selia-visualizer-base).

### Visualizer basics

The visualizer has the following attributes. These are given at construction and should not be changed.

* `canvas`

    The canvas in which the object being visualized is displayed.
    
* `itemInfo`

    Information about the item to be displayed. Given the current state of Selia,
    the url at which the item is available is `this.itemInfo.url + /download/`.
    
* `active`

    A boolean variable that indicates whether the visualizer should respond to external events. If this
    variable is false no updates should be made by the visualizer.
    
* `activator`

    A function that sends a signal when called, telling any other components that the user wants to interact with the
    visualizer. This function should be used specially in the toolbar to indicate that the visualizer should be activated.
    
Any visualizer should store all variables used to create the visualization and make sure they are updated whenever
there is a change in visualization.

### Building a visualizer

Any visualizer must redefine the following methods:

#### `getConfig()`

This method should return a single object containing all current configuration
variables. This object should be [json](https://www.json.org/) serializable.

#### `setConfig(config)`

This method should set all configuration variables to whatever is contained in the `config` arugment and update the
visualization.

#### `canvasToPoint(p)`

There are generally two sets of coordinates: the coordinates for the canvas and the coordinates for the visualized object.
This method should translate canvas coordinates `p` into the "natural" coordinates of the visualized object.

#### `pointToCanvas(p)`

This method is the inverse to `this.canvasToPoint` as it should convert "natural" coordinates into canvas coordinates.

#### `init()`

This method serves to initialize the visualizer and is run only once.

#### `draw()`

This method should redraw the visualization in the canvas using the current configuration variables.

#### `getEvents()`

This method should return a mapping of canvas envents to functions that handle this events. For example

```javascript
getEvents() {
  return {
    mousemove: (event) => handleMouseMoveFunction(event),
    mouseup: (event) => handleMouseUpFunction(event)
  }
}
```

#### `renderToolbar()`

This method should return a React component that draws the toolbar. For example:

```javascript
renderToolbar() {
  return (
    <div>
      <button onClick={() => this.resetVisualizer()}>Reset</button>
    </div>
  );
}
```

## Example

To see a functioning example see [image visualizer](https://github.com/mbsantiago/selia-image-visualizer).
