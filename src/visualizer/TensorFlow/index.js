import * as tf from '@tensorflow/tfjs';
tf.backend('webGL');

class tensorOperator{
    constructor(){
        function divideFileIntoTensors(file,singleTensorSize,freeIntersectionSize){
            let tensorBuffer = tf.tensor1d(new Float32Array(file)); //Tensor con la informacion del archivo
            let frames = tf.signal.frame(tensorBuffer, singleTensorSize, freeIntersectionSize);
            return frames
        }

        function changeTensorFrame(frames, windowType){
            let windowed_frames = windowType.mul(frames);
            return windowed_frames 
        }

        function tensorLogarithFrameFFT(frames){
            let tensorfft = tf.abs(frames)
            return tf.log(tensorfft);
        }
    }    
}

let TensorOperator = new tensorOperator();

export default TensorOperator;
            
