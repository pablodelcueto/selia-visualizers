const STFT_BUFFER_MAX_SIZE = 10000000; //Tamaño máximo del buffer para los valores del STFT
const COLUMNS_PER_STFT_CALCULATION = 10; // Número de columnas a calcular en cada computo del STFT.
const REQUEST_DELAY = 1;

class STFTHandler {
  constructor(audioHandler, config) {
    this.audioHandler = audioHandler;
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
    //   start: 0
    // }
    // Donde start:0 indica que el computo deberá de iniciar desde el índice 0 del arreglo
    // WAV.
    this.configs = configs;

    // Aquí también tiene que inicializarse el buffer donde se guardará toda la información
    // del STFT.
    this.STFTBuffer = Float32Array(STFT_BUFFER_MAX_SIZE);

    // También, al iniciar, el STFTHandler debería de esperar a que audioHandler esté listo y una vez
    // que esto ocurra empezar a pedir información del audioHandler, procesar está
    // información (STFT) y guardarla en su buffer.
    //--------------------------------------------
    this.waitForAudioHandler()
      .then(()=>this.)

    //--------------------------------------------
  }

  getConfig() {
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
  }

  isDone() {
    // Este método debe de regresar 'true' si ha terminado de hacer los cálculos de STFT
    // 'false' en el caso contrario.
    // Esto ocurre hasta que se ha calculado el STFT de toda la grabación o ya se lleno
    // el buffer.
  }

  reset() {
    // Este metodo borra todo el buffer y reinicia el cálculo del STFT
  }

  waitForAudioHandler() {
    // Este método debe de regresar una promesa que se resuelve cuando el audioHandler
    // está listo para la lectura.
    return new Promise ((resolve,reject)=>{
      let checkIfReady(){
        if (this.audioHandler.isReady()){
          resolve();
        }
        else {checkIfReady()}
      }
      checkIfReady();
    })
  }

  fillBuffer() {
    // Este método debe de comenzar el proceso de llenado del buffer con información del
    // STFT.
  }

  computeSTFT(wavArray) {
    // Este método debe de calcular el STFT para el fragmento de WAV utilzando las
    // configuraciones del DFT actuales.

    // Este método debe de ser asincrónico.

    // Empieza por esperar hasta que audioHandler tenga la información necesaria.
    // Una vez que la obtenga se la pasa a tensorflow para hacer el cómputo de STFT.
  }

  getAudioData({startIndex=null, startTime=null, durationColumns=COLUMNS_PER_STFT_CALCULATION} = {}) {
    // Este método pide información a el audioHandler.
    // Debe de regresar una promesa que se resuelve en la información WAV solicitada.
    let checkArray(array){
      return ((array.end-array.start)>this.config.hop*durationColumns+this.config.windowSize)
    }
    let array = this.audioHandler.read({startIndex=startIndex,startTime=startTime, durationIndex = durationColumns})
    return new Promise ((resolve,reject)=>{
      if (checkArry(array)){
        // resolve(array.)
      }
    })
  }

  setSTFTtoBuffer(startColumn, STFTarray) {
    // Este método inserta los valores resultantes del STFT en el STFTBuffer en el lugar
    // indicado.
  }

  shiftSFTTBuffer(newStartIndex) {
    // Este método debe de modificar el STFTBuffer para que empiece en el indice
    // solicitado, salvando la mayor cantidad de información previamente calculada.
    // Sincrónico.
  }
}

export default STFTHandler;
