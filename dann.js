//Activations:
function sigmoid(x) {
    return 1/(1+exp(-x));
}
function sigmoid_d(x) {
    let x1 = sigmoid(x);
    return x1 * (1 - x1);
}
function leakySigmoid(x) {
    return 1/(1+exp(-x))+(x/100);
}
function leakySigmoid_d(x) {
    let x1 = leakySigmoid(x);
    return x1 * (1 - x1);
}
function siLU(x) {

    return x/(1+exp(-x));
}
function siLU_d(x) {
    let top = (1 + exp(-x))+(x*exp(-x));
    let down = pow(1 + exp(-x), 2);
    return top/down;
}
function tanH(x) {

    let top = exp(x) - exp(-x);
    let down = exp(x)+ exp(-x);

    return (top/down);
}
function tanH_d(x) {

    return 1 - pow(tanH(x),2);
}
function leakyReLU(x) {
    if (x >= 0) {
        return 1*x;
    } else {
        return 0.1*x;
    }

}
function leakyReLU_d(x) {
    if (x >= 0) {
        return 1;
    } else {
        return 0.1;
    }

}
function linear(x) {
  return x;
}
function linear_d(x) {
  return 1;
}
function reLU(x) {
    if (x >= 0) {
        return 1*x;
    } else {
        return 0;
    }

}
function reLU_d(x) {
    if (x >= 0) {
        return 1;
    } else {
        return 0;
    }

}
function cosh(x) {
    return ((exp(x)+exp(-x))/2);
}
function sech(x) {
    return 1/cosh(x);
}



function downloadSTR(obj, exportName) {
  let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj));
  let downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();

}
let activations = {
    leakySigmoid: leakySigmoid,
    leakySigmoid_d: leakySigmoid_d,
    sigmoid: sigmoid,
    sigmoid_d: sigmoid_d,
    tanH: tanH,
    tanH_d: tanH_d,
    siLU: siLU,
    siLU_d: siLU_d,
    reLU: reLU,
    reLU_d: reLU_d,
    leakyReLU: leakyReLU,
    leakyReLU_d: leakyReLU_d
}
let lossfuncs = {
    mae: mae,
    crossEntryopy: crossEntryopy,
    lcl: lcl,
    mbe: mbe,
    mse: mse,
    softmax: softmax,
    cce: cce
}
class Dann {
    constructor(i,o) {

        this.i = i;
        this.inputs = new Matrix(i,1);

        this.o = o;
        this.outputs = new Matrix(o,1);

        this.aFunc = [];
        this.aFunc_d = [];

        this.aFunc_s = [];
        this.aFunc_d_s = [];

        this.Layers = [this.inputs,this.outputs];
        this.weights = [];
        this.biases = [];
        this.errors = [];
        this.gradients = [];

        this.outs = [];
        this.loss = 0;
        this.losses = [];
        this.lr = 0.001;
        this.arch = [];

        this.lossfunc = mse;
        this.lossfunc_s = this.lossfunc.name;

    }
    static mapArray(arr,x1,y1,x2,y2) {
      let newArr = [];
      for (let i = 0; i < arr.length;i++) {
        newArr[i] = map(arr[i],x1,y1,x2,y2);
      }
      return newArr;
    }
    feedForward(inputs) {

        this.Layers[0] = Matrix.fromArray(inputs);

        for(let i = 0; i < this.weights.length;i++) {
            this.Layers[i+1] = Matrix.multiply(this.weights[i],this.Layers[i]);
            this.Layers[i+1].add(this.biases[i]);
            this.Layers[i+1].map(this.aFunc[i]);

        }
        for (let i = 0; i < this.o; i++) {
            this.outs[i] = round((Matrix.toArray(this.Layers[this.Layers.length-1])[i])*1000)/1000;

       }
        return this.outs;

    }
    backpropagate_gradients(inputs, g) {
        let appLr = this.lr;
        this.gradients[this.gradients.length-1] = Matrix.fromArray(g);

        for (let i = this.weights.length-1; i > 0;i--) {
            let h_t = Matrix.transpose(this.Layers[i]);

            let weights_deltas = Matrix.multiply(this.gradients[i],h_t);

            this.weights[i].add(weights_deltas);
            this.biases[i].add(this.gradients[i]);

            let weights_t = Matrix.transpose(this.weights[i]);
            this.errors[i-1] = Matrix.multiply(weights_t,this.errors[i]);

            this.gradients[i-1] = Matrix.map(this.Layers[i], this.aFunc_d[i-1]);
            this.gradients[i-1].mult(this.errors[i-1]);
            this.gradients[i-1].mult(appLr);
        }

        let i_t = Matrix.transpose(this.Layers[0]);
        let weights_deltas = Matrix.multiply(this.gradients[0], i_t);

        this.weights[0].add(weights_deltas);
        this.biases[0].add(this.gradients[0]);

        this.loss = this.lossfunc(this.outs,g);
        this.losses.push();

    }
    backpropagate(inputs, t) {
        let targets = Matrix.fromArray(t);

        let appLr = this.lr;

        this.outs = this.feedForward(inputs);

        this.errors[this.errors.length-1] = Matrix.subtract(targets, this.Layers[this.Layers.length-1]);

        this.gradients[this.gradients.length-1] = Matrix.map(this.Layers[this.Layers.length-1],this.aFunc_d[this.aFunc_d.length-1]);
        this.gradients[this.gradients.length-1].mult(this.errors[this.errors.length-1]);
        this.gradients[this.gradients.length-1].mult(appLr);

        for (let i = this.weights.length-1; i > 0;i--) {
            let h_t = Matrix.transpose(this.Layers[i]);

            let weights_deltas = Matrix.multiply(this.gradients[i],h_t);

            this.weights[i].add(weights_deltas);
            this.biases[i].add(this.gradients[i]);

            let weights_t = Matrix.transpose(this.weights[i]);
            this.errors[i-1] = Matrix.multiply(weights_t,this.errors[i]);

            this.gradients[i-1] = Matrix.map(this.Layers[i], this.aFunc_d[i-1]);
            this.gradients[i-1].mult(this.errors[i-1]);
            this.gradients[i-1].mult(appLr);
        }

        let i_t = Matrix.transpose(this.Layers[0]);
        let weights_deltas = Matrix.multiply(this.gradients[0], i_t);

        this.weights[0].add(weights_deltas);
        this.biases[0].add(this.gradients[0]);

        this.loss = this.lossfunc(this.outs,t);
        this.losses.push(this.loss);

    }
    setLossFunction(str) {
    this.lossfunc_s = str
    this.lossfunc = lossfuncs[this.lossfunc_s];

}
    outputActivation(act) {

        let nor = (act);
        let der = (act + "_d");
        this.aFunc[this.Layers.length-1] = window[nor];
        this.aFunc_d[this.Layers.length-1] = window[der];
    }

    makeWeights() {
        //this function should be called after the initialisation of the hidden layers.
        for (let i = 0; i < this.Layers.length-1;i++) {


            let weights = new Matrix(this.Layers[i+1].rows,this.Layers[i].rows);
            let biases = new Matrix(this.Layers[i+1].rows,1);

            weights.randomize();
            biases.randomize();
            this.weights[i] = weights;
            this.biases[i] = biases;

            this.errors[i] = new Matrix(this.Layers[i+1].rows,1);
            this.gradients[i] = new Matrix(this.Layers[i+1].rows,1);
            if (this.aFunc[i] == undefined) {
                this.aFunc[i] = window["sigmoid"];
                this.aFunc_d[i] = window["sigmoid_d"];
                this.aFunc_s[i] = "sigmoid";
                this.aFunc_d_s[i] = "sigmoid_d";
            }


        }
        for (let i = 0; i<this.Layers.length;i++) {
            this.arch[i] = this.Layers[i].rows;
        }
    }
    addHiddenLayer(size, act) {
        let layer = new Matrix(size,1);
        let index = this.Layers.length-2;
        this.Layers.splice(this.Layers.length-1,0,layer);
        if (act !== undefined) {

            let nor = (act);
            let der = (act + "_d");
            this.aFunc[index] = window[nor];
            this.aFunc_d[index] = window[der];
            this.aFunc_s[index] = nor;
            this.aFunc_d_s[index] = der;
        }
    }

    log() {
        console.log("Dann NeuralNetwork:")
        console.log(" ");
        console.log("  Layers:")
        for (let i = 0; i < this.Layers.length;i++) {
            let str = "Hidden Layer: ";
            let afunc = "";
            if (i == 0) {
                str = "Input Layer:   ";
                afunc = "       ";
            } else if (i == this.Layers.length-1) {
                str = "Output Layer:  ";
                afunc = "  ("+this.aFunc[i-1].name+")";
            } else {
                afunc = "  ("+this.aFunc[i-1].name+")";
            }
            console.log("    " + str + Matrix.toArray(this.Layers[i]).length + afunc);
        }
        console.log(" ");
        console.log("  Other Values: ");
        console.log("    Learning rate: " + this.lr);
        console.log("    Loss Function: " + this.lossfunc.name);

    }
    save(name) {
        //weights
        let wdata = [];
        for (let i = 0; i < this.weights.length;i++) {
            wdata[i] =  JSON.stringify(this.weights[i].matrix);
        }
        let w_str = JSON.stringify(wdata);
        //layers
        let ldata = [];
        for (let i = 0; i < this.Layers.length;i++) {
            ldata[i] =  JSON.stringify(this.Layers[i].matrix);
        }
        let l_str = JSON.stringify(ldata);
        //biases
        let bdata = [];
        for (let i = 0; i < this.biases.length;i++) {
            bdata[i] =  JSON.stringify(this.biases[i].matrix);
        }
        let b_str = JSON.stringify(bdata);
        //errors
        let edata = [];
        for (let i = 0; i < this.errors.length;i++) {
            edata[i] =  JSON.stringify(this.errors[i].matrix);
        }
        let e_str = JSON.stringify(edata);
        //gradients
        let gdata = [];
        for (let i = 0; i < this.gradients.length;i++) {
            gdata[i] =  JSON.stringify(this.gradients[i].matrix);
        }
        let g_str = JSON.stringify(gdata);
        let dataOBJ = {wstr: w_str,lstr:l_str,bstr:b_str,estr:e_str,gstr:g_str,afunc:this.aFunc_s,arch:this.arch,lrate:this.lr,lf:this.lossfunc_s};
        downloadSTR(dataOBJ,name);
        //downloadSTR({weights: str, arch: this.arch, aFunc: this.aFunc},name);
    }
    mutateWeights(randomFactor) {
        for (let i = 0; i < this.Layers.length;i++) {
            this.Layers[i].addPrecent(randomFactor);
        }
    }
    loadFromJSON(objstr) {

        let xdata =  JSON.parse(objstr);

        let newNN = xdata;

        //  {wstr: w_str,lstr:l_str,bstr:b_str,estr:e_str,gstr:g_str,afunc:this.aFunc_s,arch:this.arch,lrate:this.lr}
        nn.i = newNN.arch[0];
        nn.inputs = new Matrix(this.i, 1);
        nn.o = newNN.arch[newNN.arch.length-1];
        nn.outputs = new Matrix(this.o,1);

        let slayers = JSON.parse(newNN.lstr);
        for (let i = 0; i < slayers.length; i++) {
            nn.Layers[i].set(JSON.parse(slayers[i]));
        }
        let sweights = JSON.parse(newNN.wstr);
        for (let i = 0; i < sweights.length; i++) {
            nn.weights[i].set(JSON.parse(sweights[i]));
        }
        let sbiases = JSON.parse(newNN.bstr);
        for (let i = 0; i < sbiases.length; i++) {
            nn.biases[i].set(JSON.parse(sbiases[i]));
        }
        let serrors = JSON.parse(newNN.estr);
        for (let i = 0; i < serrors.length; i++) {
            nn.errors[i].set(JSON.parse(serrors[i]));
        }
        let sgradients = JSON.parse(newNN.gstr);
        for (let i = 0; i < sgradients.length; i++) {
            nn.gradients[i].set(JSON.parse(sgradients[i]));
        }

        nn.aFunc_s = newNN.afunc;
        nn.aFunc = [];
        nn.aFunc_d = [];
        nn.aFunc_d_s = [];
        for (let i = 0; i < newNN.afunc.length;i++) {
            let fstr = newNN.afunc[i];
            nn.aFunc.push(window[fstr]);
            nn.aFunc_d.push(window[(fstr+"_d")]);
            nn.aFunc_d_s.push((fstr+"_d"))
        }

        nn.lossfunc = window[newNN.lf];
        nn.lossfunc_s = newNN.lf;

        nn.outs = Matrix.toArray(nn.Layers[nn.Layers.length-1]);
        nn.loss = 0;
        nn.losses = [];
        nn.lr = newNN.lrate;
        nn.arch = newNN.arch;

        nn.log();
        console.log("");
        console.log("Succesfully loaded the Dann Model");
    }
    load() {

        upload(this)
    }
}
function clickedUpload(nn) {
    let element = document.getElementById('upload');
    let file = element.files[0];

    let reader = new FileReader();

    reader.readAsText(file);

    reader.onload = function() {
        console.log();


        let xdata =  JSON.parse(reader.result);

        let newNN = xdata;

        //  {wstr: w_str,lstr:l_str,bstr:b_str,estr:e_str,gstr:g_str,afunc:this.aFunc_s,arch:this.arch,lrate:this.lr}
        nn.i = newNN.arch[0];
        nn.inputs = new Matrix(this.i, 1);
        nn.o = newNN.arch[newNN.arch.length-1];
        nn.outputs = new Matrix(this.o,1);

        let slayers = JSON.parse(newNN.lstr);
        for (let i = 0; i < slayers.length; i++) {
            nn.Layers[i].set(JSON.parse(slayers[i]));
        }
        let sweights = JSON.parse(newNN.wstr);
        for (let i = 0; i < sweights.length; i++) {
            nn.weights[i].set(JSON.parse(sweights[i]));
        }
        let sbiases = JSON.parse(newNN.bstr);
        for (let i = 0; i < sbiases.length; i++) {
            nn.biases[i].set(JSON.parse(sbiases[i]));
        }
        let serrors = JSON.parse(newNN.estr);
        for (let i = 0; i < serrors.length; i++) {
            nn.errors[i].set(JSON.parse(serrors[i]));
        }
        let sgradients = JSON.parse(newNN.gstr);
        for (let i = 0; i < sgradients.length; i++) {
            nn.gradients[i].set(JSON.parse(sgradients[i]));
        }

        nn.aFunc_s = newNN.afunc;
        nn.aFunc = [];
        nn.aFunc_d = [];
        nn.aFunc_d_s = [];
        for (let i = 0; i < newNN.afunc.length;i++) {
            let fstr = newNN.afunc[i];
            nn.aFunc.push(window[fstr]);
            nn.aFunc_d.push(window[(fstr+"_d")]);
            nn.aFunc_d_s.push((fstr+"_d"))
        }

        nn.lossfunc = window[newNN.lf];
        nn.lossfunc_s = newNN.lf;

        nn.outs = Matrix.toArray(nn.Layers[nn.Layers.length-1]);
        nn.loss = 0;
        nn.losses = [];
        nn.lr = newNN.lrate;
        nn.arch = newNN.arch;

        nn.log();
        console.log("");
        console.log("Succesfully loaded the Dann Model");
    };

    reader.onerror = function() {
      console.log(reader.error);
    };

    element.remove();

}

function upload(nn) {
    let downloadAnchorNode = document.createElement('input');
    downloadAnchorNode.setAttribute("type", "file");
    downloadAnchorNode.setAttribute("id", "upload");
    downloadAnchorNode.setAttribute("onChange", "clickedUpload(nn)");
    document.body.appendChild(downloadAnchorNode);

}

// loss functions:
function mae(predictions,target) {
    let sum = 0;
    let ans = 0;
    let l = target.length;
    for (let i = 0; i < l; i++) {
        let y = target[i]
        let yHat = predictions[i];
        sum += abs(y - yHat)/2;
    }
    ans = sum/l;
    return ans;
}
function crossEntryopy(predictions,target) {
    let sum = 0;
    let ans = 0;
    let l = target.length;
    for (let i = 0; i < l; i++) {
      let y = target[i]
      let yHat = predictions[i];

      sum+= -(y*log(yHat)+(1-y)*log(1-yHat));

    }
    ans = sum/l;
    return ans;
}
function lcl(predictions,target) {
    let sum = 0;
    let ans = 0;
    let l = target.length;
    for (let i = 0; i < l; i++) {
      let y = target[i]
      let yHat = predictions[i];

        sum += log(cosh(yHat - y));
    }
    ans = sum/l;
    return ans;
}
function mbe(predictions,target) {
    let sum = 0;
    let ans = 0;
    let l = target.length;
    for (let i = 0; i < l; i++) {
      let y = target[i]
      let yHat = predictions[i];

        sum += (y - yHat);
    }
    ans = sum/this.o;
    return ans;
}
function mse(predictions,target) {
    let sum = 0;
    let ans = 0;
    let l = target.length;
    for (let i = 0; i < l; i++) {
      let y = target[i]
      let yHat = predictions[i];

        sum += pow(y - yHat,2);
    }
    ans = sum/this.o;
    return ans;
}
//softmax function:
function softmax(xarr,i) {
  let l = xarr.length;
  let sum = 0;
  for (let j = 0; j < l;j++) {
    sum+=exp(xarr[j])
  }
  if (arguments.length<2){
    let arr = [];
    for (let j = 0; j < l;j++) {
      arr[j] = exp(xarr[j])/sum;
    }
    return arr
  } else {
    return exp(xarr[i])/sum;
  }

}
function cce(predictions, target) {

  let c = target.length;

  let sum = 0;
  for (let i = 0; i < c; i++) {
    let t = target[i]
    sum+= t*log(softmax(predictions,i))
  }
  return abs(-sum - 1.4611501717344748 - 0.0818903006748597);
}
// Matrix Math:
class Matrix {
    constructor(rows,cols) {

        this.rows = rows;
        this.cols = cols;
        this.matrix = [];

        for (let i = 0; i < this.rows; i++) {
            this.matrix[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.matrix[i][j] = 0;
            }

        }
    }
    static toArray(m) {
        let ans = [];
        if (m.cols == 1) {

            for (let i = 0; i < m.rows; i++) {
                ans[i] = m.matrix[i][0];
            }
        }
        return ans;
    }
    static fromArray(arr) {
        let m = new Matrix(arr.length,1);

        for (let i = 0; i < arr.length; i++) {
            m.matrix[i][0] = arr[i];
        }

        return m;
    }
    static transpose(m) {
        let result = new Matrix(m.cols,m.rows);
        for (let i = 0; i < m.rows; i++) {
            for(let j = 0; j < m.cols; j++) {
                result.matrix[j][i] = m.matrix[i][j];
            }
        }
        return result;
    }
    static map(m,f) {
        for (let i = 0; i < m.rows; i++) {
            for(let j = 0; j < m.cols; j++) {
                let v = m.matrix[i][j];
                m.matrix[i][j] = f(v);
            }
        }
        return m;
    }
    static addition(m1,m2) {

        let a = m1;
        let b = m2;

        let ans = new Matrix(a.rows, a.cols);
        if (a.rows !== b.rows || a.cols !== b.cols) {
            return;
        } else {
            for (let i = 0; i < ans.rows; i++) {
                for(let j = 0; j < ans.cols; j++) {
                    ans.matrix[i][j] = a.matrix[i][j] - b.matrix[i][j];
                }
            }
        }
        return ans;
    }
    static subtract(m1,m2) {

        let a = m1;
        let b = m2;

        let ans = new Matrix(a.rows, a.cols);
        if (a instanceof Matrix && b instanceof Matrix) {

                for (let i = 0; i < ans.rows; i++) {

                    for(let j = 0; j < ans.cols; j++) {

                        ans.matrix[i][j] = a.matrix[i][j] - b.matrix[i][j];
                    }
                }
        }
        return ans;
    }
    static multiply(m1,m2) {

        let a = m1;
        let b = m2;

        let ans = new Matrix(a.rows, b.cols);
        if (m1 instanceof Matrix && m2 instanceof Matrix) {
            if (a.cols !== b.rows) {
                console.log("not compatible");
                return undefined;
            } else {
                for (let i = 0; i < ans.rows; i++) {
                    for (let j = 0; j < ans.cols; j++) {
                        let sum = 0;
                        for (let k = 0; k < a.cols; k++) {
                          sum += a.matrix[i][k] * b.matrix[k][j];
                        }
                        ans.matrix[i][j] = sum;
                    }
                }
            }
            return ans;
        }
    }
    addPrecent(percent) {
        for (let i = 0; i < this.rows; i++) {
            for(let j = 0; j < this.cols; j++) {
                this.matrix[i][j] += this.matrix[i][j]*percent;
            }
        }
    }
    set(matrix) {
        this.matrix = matrix;
    }
    add(n) {
        if (n instanceof Matrix) {
            if (this.rows !== n.rows || this.cols !== n.cols) {
                return;
            } else {
                for (let i = 0; i < this.rows; i++) {
                    for(let j = 0; j < this.cols; j++) {
                        this.matrix[i][j] += n.matrix[i][j];
                    }
                }
            }

        } else {
            for (let i = 0; i < this.rows; i++) {
                for(let j = 0; j < this.cols; j++) {
                    this.matrix[i][j] += n;
                }
            }
        }
    }
    sub(n) {

        for (let i = 0; i < this.rows; i++) {
            for(let j = 0; j < this.cols; j++) {
                this.matrix[i][j] -= n;
            }
        }
    }
    mult(n) {

        if (n instanceof Matrix) {
            if (this.rows !== n.rows || this.cols !== n.cols) {
                console.log("rows of A must match rows of B")
                return;
            } else {
                for (let i = 0; i < this.rows; i++) {
                    for(let j = 0; j < this.cols; j++) {
                        this.matrix[i][j] *= n.matrix[i][j];
                    }
                }
            }

        } else {
            for (let i = 0; i < this.rows; i++) {
                for(let j = 0; j < this.cols; j++) {
                    this.matrix[i][j] *= n;
                }
            }
        }

    }

    initiate() {
        for (let i = 0; i < this.matrix.length; i++) {
            for (let j = 0; j < this.matrix[i].length; j++) {
                this.matrix[i][j] = 1;
            }
        }
    }
    map(f) {
        for (let i = 0; i < this.rows; i++) {
            for(let j = 0; j < this.cols; j++) {
                let v = this.matrix[i][j];
                this.matrix[i][j] = f(v);
            }
        }
    }
    randomize() {
        for (let i = 0; i < this.matrix.length; i++) {
            for (let j = 0; j < this.matrix[i].length; j++) {
                this.matrix[i][j] = random(-1,1);
            }
        }
    }
}
let dragged = false;
let fontColor = [255,255,255];
let contourColor = [0,0,0];
//Plot any Dann neural Network:
class NetPlot {
  constructor(x,y,w,h,nn) {
    this.pos = createVector(x,y);
    this.w = w;
    this.h = h;
    this.nn = nn;
    this.spacingY = h/(this.nn.i-1);
    this.layerSpacing = w/(this.nn.Layers.length-1);
    this.bufferY = this.spacingY/2;
    this.size = 8;
    this.frame = false;
    this.wColors = [[255, 60, 0],[0,195,255]];

  }

  renderWeights() {
    stroke(contourColor);
    for (let i = 0; i < this.nn.Layers.length; i++) {

      let layer = Matrix.toArray(this.nn.Layers[i]);

      this.spacingY = (this.h/(layer.length));
      this.bufferY = this.spacingY/2

      if (i !== this.nn.Layers.length-1) {

        let nextLayer = Matrix.toArray(this.nn.Layers[i+1]);
        let sY = (this.h/(nextLayer.length));
        let bY = sY/2;

        for (let j = 0; j < nextLayer.length; j++) {

          let x = this.pos.x+((i+1)*this.layerSpacing);
          let y = this.pos.y+bY+((j)*sY);
          let x2 = 0;
          let y2 = 0

          for (let k = 0; k < layer.length; k++) {

            let weights = (this.nn.weights[i]).matrix;
            x2 = this.pos.x+((i)*this.layerSpacing);
            y2 = this.pos.y+this.bufferY+((k)*this.spacingY);
            stroke(this.mapColor(colorGradientFunc(weights[j][k])));
            strokeWeight(map(sqrt(int(weights[j][k]*1000)/1000),0,2,1,2));
            line(x,y,x2,y2);

          }

        }
      }


    }
  }
  renderLayers() {
    fill(255);
    noStroke();

    for (let i = 0; i < this.nn.Layers.length; i++) {

      let layer = Matrix.toArray(this.nn.Layers[i]);
      this.spacingY = (this.h/(layer.length));
      this.bufferY = this.spacingY/2;
      for (let j = 0; j < layer.length; j++) {

        let x = this.pos.x+((i)*this.layerSpacing);
        let y = this.pos.y+this.bufferY+((j)*this.spacingY);

        //let col = map(layer[j],0,1,0,255);
        let col = this.mapColor(colorGradientFunc2(layer[j]))
        fill(col);
        ellipse(x,y,this.size,this.size);

      }
    }
  }

  mapColor(x) {
    let color1 = this.wColors[0]
    let color2 = this.wColors[1]
    let r = map(x,0,1,color2[0],color1[0])
    let g = map(x,0,1,color2[1],color1[1])
    let b = map(x,0,1,color2[2],color1[2])
    return color(r,g,b)
  }
  render() {
    noFill();
    stroke(contourColor[0],contourColor[1],contourColor[2]);
    if (this.frame == true) {
      rect(this.pos.x,this.pos.y,this.w,this.h);
    }


    if (dragged&&mouseX >= this.pos.x && mouseX<=this.pos.x+this.w&&mouseY >= this.pos.y&&mouseY<=this.pos.y+this.h) {
        this.pos.x = mouseX-(this.w/2);
        this.pos.y = mouseY-(this.h/2);
    }
    this.renderWeights();
    this.renderLayers();

  }
}
function colorGradientFunc(x) {
  return 1 / (1+ exp(-2*x))
}
function colorGradientFunc2(x) {
  return 1 / (1+ exp(-10*(x-0.5)))
}
// Graph (graph any values over time):
class Graph {
    constructor(x,y,w,h) {
        this.pos = createVector(x,y);
        this.w = w;
        this.h = h;
        this.s = 1;
        this.min = 1;
        this.max = 0;
        this.lines = [];
        this.names = [];
        this.color = [];
        this.dragged = false;
        this.grid = 4;
        this.step = 0;

    }
    addValue(x,color,name) {
        this.color.push(color)
        this.lines.push(x);
        this.names.push(name);
    }
    render() {
        noFill();


        strokeWeight(1);

        stroke(contourColor[0],contourColor[1],contourColor[2],80);

        for (let i = 0; i < this.grid; i++) {
            let y = (this.h/this.grid)*i;
            line(this.pos.x,y+this.pos.y,this.pos.x+this.w,y+this.pos.y);
        }
        stroke(contourColor[0],contourColor[1],contourColor[2])
        rect(this.pos.x,this.pos.y,this.w,this.h);
        if (dragged&&mouseX >= this.pos.x && mouseX<=this.pos.x+this.w&&mouseY >= this.pos.y&&mouseY<=this.pos.y+this.h) {
          this.pos.x = mouseX-(this.w/2);
          this.pos.y = mouseY-(this.h/2);
        }
        for (let a = 0; a < this.lines.length; a++) {
            stroke(this.color[a]);
            beginShape();
            if (this.lines[a].length/int(this.s) >= this.w*int(this.s)) {
                this.s*=2;
            }

            for (let i = 0; i < int(this.lines[a].length/int(this.s)); i+=int(this.s)) {
                let x = (i/int(this.s))+this.pos.x;
                let y = map(this.lines[a][i*int(this.s)],this.min,this.max,this.pos.y,this.pos.y+this.h);
                vertex(x, y);

            }
            endShape();
            noStroke();
            fill(this.color[a])
            rect((this.pos.x+this.w)-((this.pos.x+this.w)/6),(a*20)+10+this.pos.y,20,10);
            //let textstr = Object.keys({this.lines[a]})[0];

            //console.log(Object.keys(this.lines[a])[0]);
            text(this.names[a],(this.pos.x+this.w)-((this.pos.x+this.w)/6)+23,(a*20)+19+this.pos.y);
            noFill();
        }
        stroke(contourColor[0],contourColor[1],contourColor[2])
        let div = 1;
        if (this.s >= 8) {
            div = 10;
        }
        let length = int(this.w/(this.step/(pow(this.s,2)))/div);
        for (let i = 0; i < length; i++) {
            if (this.s >= 8) {
            }
            let x = ((this.step/(pow(this.s,2)))*(i*div))+this.pos.x;
            let y = this.pos.y+this.h;
            line(x,y,x,y-5);
            //text(x,y+8,div);

        }
        noStroke();
    }

}
//Graph the gradients
class GradientGraph {
    constructor(x,y,w,h,nn) {
        this.pos = createVector(x,y);
        this.w = w;
        this.h = h;

        this.nn = nn;
        this.pixelSize = 5;
        this.positionsX = [];
        this.offsets = [];
        this.boxespos = [];
    }
    initiateValues() {
        for (let m = 0; m < nn.weights.length;m++) {
            let weights = nn.weights[m].matrix;
            let offset = 0;
            if(m == 0) {
                offset = 0;
                this.positionsX[m] = offset;
                this.offsets.push(offset);
            } else {
                let sum = 0;
                for (let i = 0; i < m; i++) {
                    sum+=this.positionsX[i];
                }
                offset = this.pixelSize*(sqrt(nn.weights[m-1].matrix[0].length))*sqrt(nn.weights[m-1].matrix.length);
                this.positionsX[m] = offset;
                offset += sum;
                this.offsets.push(offset);
            }

        }
    }
    render() {

        for (let m = 0; m < nn.weights.length;m++) {
            let weights = nn.weights[m].matrix;

            let len = sqrt(weights.length);

            for (let i = 0; i < len;i++) {
                for (let j = 0; j< len;j++) {

                    let windex = 0;
                    if (m !== 0) {
                        windex = m-1;
                    } else {
                        windex = 0;
                    }

                    let innerLen = sqrt(weights[windex].length);

                    let bx = this.pos.x+((this.pixelSize*innerLen)*i)+this.offsets[m]+(m*10);
                    let by = this.pos.y+((this.pixelSize*innerLen)*j);


                    for (let x = 0; x < innerLen;x++) {
                        for (let y = 0; y< innerLen;y++) {
                            let bx_ = (x*this.pixelSize)+bx;
                            let by_ = (y*this.pixelSize)+by;
                            fill(map(weights[(i*len)+j][(x*innerLen)+y],-1,1,0,255));
                            noStroke()
                            rect(bx_,by_,this.pixelSize,this.pixelSize)
                        }
                    }
                    noFill();
                    stroke(255,0,0,255);
                    strokeWeight(1);
                    rect(bx,by,(this.pixelSize*innerLen),(this.pixelSize*innerLen))

                }
            }
        }




    }
}
class InfoBox {
    constructor(x,y,w,h,nn) {
        this.pos = createVector(x,y);
        this.w = w;
        this.h = h;
        this.nn = nn;
    }
    render() {
        noFill();
        stroke(contourColor[0],contourColor[1],contourColor[2]);
        //rect(this.pos.x,this.pos.y,this.w,this.h);
        noStroke();
        fill(fontColor[0],fontColor[1],fontColor[2]);
        text("Dann Neural Network:",this.pos.x+6,this.pos.y+12);
        let layertext = 30;
        text("Layers:",this.pos.x+12,this.pos.y+layertext);
        for (let i = 0; i < nn.Layers.length;i++) {
            let str = "Hidden Layer: ";
            let afunc = "";
            if (i == 0) {
                str = "Input Layer:      ";
                afunc = "       ";
            } else if (i == nn.Layers.length-1) {
                str = "Output Layer:   ";
                afunc = "  ("+nn.aFunc[i-1].name+")";
            } else {
                afunc = "  ("+nn.aFunc[i-1].name+")";
            }
            text("    " + str + Matrix.toArray(nn.Layers[i]).length + afunc,this.pos.x,this.pos.y+layertext+18+(i*14));
        }



    }
}
