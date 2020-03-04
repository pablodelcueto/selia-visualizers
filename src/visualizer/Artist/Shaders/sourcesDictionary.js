import {VERTEX_SHADER, FRAGMENT_SHADER} from './loadingShaders'

const PROGRAM_1 = 'Loading Program';
const PROGRAM_2 = 'Using Textures';

const PROGRAMS = {
    [PROGRAM_1]: [],
    [PROGRAM_2]: [VERTEX_SHADER, FRAGMENT_SHADER],
}

export {
    PROGRAMS, PROGRAM_1, PROGRAM_2,    
};