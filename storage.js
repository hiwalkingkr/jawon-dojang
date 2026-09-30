const K='jawon-doljang-v1',DEF={stamps:[false,false,false,false],wrong:[]};
export const load=()=>{try{return{...DEF,...JSON.parse(localStorage.getItem(K))}}catch{return{...DEF}}};
export const save=s=>{try{localStorage.setItem(K,JSON.stringify(s))}catch{}};
