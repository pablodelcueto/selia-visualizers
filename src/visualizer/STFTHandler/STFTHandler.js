  import * as tf from '@tensorflow/tfjs';

const STFT_BUFFER_MAX_SIZE = 1024*25000 //Tamaño máximo del buffer para los valores del STFT 
const COLUMNS_PER_STFT_COMPUTATION = 20; // Número de columnas a calcular en cada computo del STFT.
const CHECK_HEADER_DELAY = 1;
const CHECK_READIBILITY_DELAY = 1;
const INIT_CONFIG = {
      STFT: { 
        window_size: 1024,
        hop_length: 256,
        window_function: 'hann',
      },
      startWAVindex: 256*0,   
      startGlobalColumn: 0,
    }



class STFTHandler {
  constructor(audioHandler) {
    this.audioHandler = audioHandler;
    this.lastComputedBufferColumn=-1;
    this.config = INIT_CONFIG;
    this.tensorWindowType = this.tensorWindowFunctionTypeMap(this.config.STFT.window_function);
    this.init();
  }  

  init(){
    this.bufferColumnHeight = this.config.STFT.window_size/2+1;
    this.bufferColumns = Math.floor(STFT_BUFFER_MAX_SIZE / this.bufferColumnHeight); 
    this.initialGlobalColumn = this.bufferColumnToGlobalColumn(0);
    this.finalGlobalColumnInBuffer = this.bufferColumnToGlobalColumn(this.bufferColumns);
    this.tensorBuffer = tf.tensor1d(new Float32Array((COLUMNS_PER_STFT_COMPUTATION-1)*this.config.STFT.window_size));
    this.STFTBuffer = new Float32Array(this.bufferColumns*this.bufferColumnHeight).fill(1);
    this.waitForAudioHandler()
      .then(()=>{ 
        this.fillBuffer(0,this.config.startGlobalColumn);
      })
  }


    // audioHandler es una instancia de la clase Audio y se encarga de cargar el archivo
    // de audio. Para acceder a sus datos hay que usar el método audioHandler.read.
    // Para saber si está listo basta llamar audioHandler.isReady

    // configs es un objecto que contiene las configuraciones de generación de espectrograma
    // y de ubicación temporal (donde empezar a hacer el STFT).

    // por ejemplo:
    // config = {
    //   STFT: { 
    //     window_size: 1024,
    //     hop_length: 256,
    //     window_function: 'hann'
    //   },
    //   start: 0,   
    // }
    // Donde start:0 indica que el computo deberá de iniciar desde el índice 0 del arreglo
    // WAV.

    // Aquí también tiene que inicializarse el buffer donde se guardará toda la información
    // del STFT.

    // También, al iniciar, el STFTHandler debería de esperar a que audioHandler esté listo y una vez
    // que esto ocurra empezar a pedir información del audioHandler, procesar está
    // información (STFT) y guardarla en su buffer.
    //--------------------------------------------
    

    //--------------------------------------------
  

  tensorWindowFunctionTypeMap(windowFunction){
    if(windowFunction === 'hann'){
      return tf.hannWindow(this.config.STFT.window_size);
    }
    else if(windowFunction === 'hamming'){
      return tf.signal.hamming_window(this.config.STFT.window_size);
    }
    else if(windowFunction === 'linear'){
      return tf.ones([this.config.STFT.window_size], 'float32');
    }
  }

  waitForAudioHandler() {
    // Este método debe de regresar una promesa que se resuelve cuando el audioHandler
    // está listo para la lectura.
    return new Promise ((resolve,reject)=>{
      let checkIfHeader = () => {
        if (this.audioHandler.isReady()){
          resolve();
        }
        else {setTimeout(checkIfHeader,CHECK_HEADER_DELAY)}
      }
      checkIfHeader();
    })
  }

  getConfig() {
    return this.config;
    // Función que deberá de arrojar todas las configuraciones actuales (parámetros del
    // STFT y ubicación temporal)
  }

  setConfig(newConfig) {
    // Función que permite ajustar las configuraciones. Un cambio en las configuraciones
    // implica borrar todo el buffer y recalcular el STFT (en caso de que sea un cambio a
    // las configuraciones del STFT), o bien hacer un shift del buffer y calcular los
    // pedazos restantes (en caso de que se haga un cambio de la ubicación temporal)
    
  }

  read({startColumn=0, startTime=null, endColumn=-1, endTime=null, durationColumns=null, durationTime=null} = {}) {
    // Esta función debe de regresar el fragmento del buffer de valores del STFT según
    // fue pedido por el usuario.

    // Este método debe de ser sincrónico!!!!

    // En caso de no tener toda la información pedida, debe de regresar la información que
    // si tiene, y especificar qué fragmento de la información se está regresando.
    if(startTime!=null){
      let startWAVindex = this.audioHandler.getIndex(startTime);
      startColumn = this.WAVindexToGlobalColumn(startWAVindex); 
    }

    if(endColumn<0 || durationTime<0){
      endColumn = this.lastComputedBufferColumn;
    }

    if(endTime != null){
      endColumn = this.WAVindexToGlobalColumn(this.audioHandler.getIndex(endTime));
    }

    if(durationTime != null){
      durationColumns = this.WAVindexToGlobalColumn(this.audioHandler.getIndex(durationTime));
    }

    if(durationColumns != null) {
      endColumn = startColumn + durationColumns;
    }


    let start_Column = Math.floor(Math.max(0, startColumn));
    let end_Column = Math.floor(Math.max(Math.min(this.lastComputedBufferColumn, endColumn),start_Column));

    let array = this.STFTBuffer.slice(this.bufferColumnToBufferIndex(start_Column), this.bufferColumnToBufferIndex(end_Column));
    if(this.shouldShift(startColumn,endColumn)){
      this.shiftSTFTBuffer(startColumn) 
    }

    return {
      start : start_Column,
      end : end_Column,
      data : array,
      lastComputedBufferColumn : this.lastComputedBufferColumn,
    }

  }
  
  WAVindexToGlobalColumn(index){ //computes the first complete column in which index is used for STFT.
    let intersectionSize = this.config.STFT.window_size-this.config.STFT.hop_length;
    return Math.max(0,Math.floor((index-intersectionSize)/this.config.STFT.hop_length)); 
  }

  globalColumnToWAVindex(column){ //the base index on the column
    return column*this.config.STFT.hop_length;
  }

  WAVindexToBufferColumn(index){ //first buffer column wich used the index for it's computations
    let column = WAVindexToGlobalColumn(index)-this.config.startGlobalColumn;
    return column;
  }

  bufferColumnToWAVindex(column){ 
    return (column+this.config.startGlobalColumn)*this.config.STFT.hop_length
  }

  bufferColumnToGlobalColumn(column){
    let wavIndex = this.bufferColumnToWAVindex(column);
    // return this.initialGlobalColumn + column
    return this.WAVindexToGlobalColumn(wavIndex);
  }

  isGlobalColumnInBuffer(column){     
    if (this.initialGlobalColumn<column && column< this.finalGlobalColumnInBuffer){
      return true;
    }
    else {return false}
  }

  bufferColumnToBufferIndex(column){ // returns the index where column begins inside buffer
    return column*this.bufferColumnHeight;
  }

  globalColumnToBufferColumn(column){
    if (this.isGlobalColumnInBuffer(column)){
      return column - this.initialGlobalColumn
    }
    else {
      return null;
    }
  }

  shouldShift(startColumn,endColumn){
    return false;
  }
  
  shiftSTFTBuffer(newInitialColumn) { //Modificar a newStartColumn
    // Este método debe de modificar el STFTBuffer para que empiece en la columna
    // solicitada, salvando la mayor cantidad de información previamente calculada.
    // Sincrónico.
    let newFinalColumn = newInitialColumn + this.bufferColumns;
    if (this.isGlobalColumnInBuffer(newInitialColumn) 
      && newInitialColumn < this.bufferColumnToGlobalColumn(this.lastComputedBufferColumn) ){
      console.log('is shifting');
      let newInitialColumnInBufferColumn = this.globalColumnToBufferColumn(newInitialColumn);
      let subArrayReused = this.read({startColumn:newInitialColumnInBufferColumn,
                                      endColumn:this.lastComputedBufferColumn}).data;
      console.log('subArrayReused', subArrayReused);
      this.setSTFTtoBuffer(0,subArrayReused);
      this.lastComputedBufferColumn = this.lastComputedBufferColumn-newInitialColumnInBufferColumn;
      this.initialGlobalColumn = newInitialColumn;
      this.finalGlobalColumnInBuffer = newFinalColumn;
      this.fillBuffer(this.lastComputedBufferColumn+1, this.bufferColumnToWAVindex(this.lastComputedBufferColumn+1))
      // console.log('STFTBuffer', this.STFTBuffer);
    }

    // else if(this.isGlobalColumnInBuffer(newFinalColumn)){
    //   console.log('Sigue al else')
    // }
    
    // else{ //Si se debe rellenar completamente el STFTBuffer
    //   this.config.startWAVindex = newStartIndex;
    //   this.resetBuffer();
    // }
    

  }

  isDone() {
    // Este método debe de regresar 'true' si ha terminado de hacer los cálculos de STFT
    // 'false' en el caso contrario.
    // Esto ocurre hasta que se ha calculado el STFT de toda la grabación o ya se lleno
    // el buffer.
    var posibleNewLastColumn = this.lastComputedBufferColumn + COLUMNS_PER_STFT_COMPUTATION;
    var posibleNewLastWAVindex = this.bufferColumnToWAVindex(posibleNewLastColumn+1)-1 ; 
    if (posibleNewLastColumn > this.bufferColumns){
      return true //Se cumple cuando se acaba el espacio del buffer
    }
    else if(!this.audioHandler.isIndexInFile(posibleNewLastWAVindex)) {
      return true //Se cumple cuando se ya no puede seguir leyendo audio para posibleNewLastColumn
    }
    else{return false}
  }

  resetBuffer() {
    // Este metodo borra todo el buffer y reinicia el cálculo del STFT con las nuevas configuraciones.
    this.fillBuffer(0,this.config.initialGlobalColumn);
  }

  fillBuffer(initialBufferColumn, initialGlobalColumn) {
    // Este método debe de comenzar el proceso de llenado del buffer con información del
    // STFT.
    this.fillByChunks(initialBufferColumn, initialGlobalColumn) // start when the lastComputedBufferColumn = 0;
  }

  fillByChunks(initialBufferColumn,initialGlobalColumn){ 
  // It sets the data that should belong in the next COLUMNS_PER_STFT_COMPUTATION's columns after initialColumn 
    if (this.checkSpace(initialBufferColumn)){
      this.getAudioData({startWAVIndex : this.globalColumnToWAVindex(initialGlobalColumn)})
        .then((arrayResult) => {
          return this.computeSTFT(arrayResult);      
        })
        .then((STFTresult)  =>this.setSTFTtoBuffer(initialBufferColumn, STFTresult)) 
        .then(()            => {
            this.lastComputedBufferColumn=this.lastComputedBufferColumn+ COLUMNS_PER_STFT_COMPUTATION; 
            initialBufferColumn = initialBufferColumn + COLUMNS_PER_STFT_COMPUTATION; 
            initialGlobalColumn = initialGlobalColumn + COLUMNS_PER_STFT_COMPUTATION;  
            // initialWAVindex = this.bufferColumnToWAVindex(initialBufferColumn);
            this.fillByChunks(initialBufferColumn, initialGlobalColumn); 
                
        })
    }
    else{
    //Que hacer en caso de no caber mas calculos en STFTBuffer  
    } 
  }

  getAudioData({startWAVIndex=null, startTime=null, durationColumns=COLUMNS_PER_STFT_COMPUTATION} = {}) {
    // Este método pide información a el audioHandler.
    // Debe de regresar una promesa que se resuelve en la información WAV solicitada.
    var lastWAVIndex = startWAVIndex+(durationColumns-1)*this.config.STFT.hop_length
                  +this.config.STFT.window_size;

    return new Promise ((resolve,reject)=>{
      let checkIfReady = () => {
        if (this.audioHandler.canRead(lastWAVIndex)){
           let array = this.audioHandler.read({startIndex:startWAVIndex,endIndex : lastWAVIndex})
           resolve(array)
        }
        else{setTimeout(checkIfReady, CHECK_READIBILITY_DELAY)}
      }
      checkIfReady();
    })
  }
 

  async computeSTFT(wavArray) {
    // Este método debe de calcular el STFT para el fragmento de WAV utilzando las
    // configuraciones del DFT actuales.

    // Este método debe de ser asincrónico.

    // Empieza por esperar hasta que audioHandler tenga la información necesaria.
    // Una vez que la obtenga se la pasa a tensorflow para hacer el cómputo de STFT.
    this.tensorBuffer = tf.tensor1d(new Float32Array(wavArray.data));
    this.frames = tf.signal.frame(this.tensorBuffer, this.config.STFT.window_size, this.config.STFT.hop_length);
    this.windowed_frames = this.tensorWindowType.mul(this.frames);
    this.tensordb = tf.abs(this.windowed_frames.rfft()).flatten();
    // tf.print(this.frames);
    // console.log('shape', this.tensordb.shape);
    return this.tensordb.data();
  }

  checkSpace(initialColumn){ //Checks for a new block of columns beginning at initialColumn
    return (COLUMNS_PER_STFT_COMPUTATION + initialColumn < this.bufferColumns)
  } 

  setSTFTtoBuffer(startColumn, STFTarray) {
    // Este método inserta los valores resultantes del STFT en el STFTBuffer en el lugar
    // indicado.
    var bufferIndex = this.bufferColumnToBufferIndex(startColumn);
    this.STFTBuffer.set(STFTarray, bufferIndex);
  } 



  
}

export default STFTHandler;
