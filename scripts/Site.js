var visualizer;

$(document).ready(function () {
    visualizer = new AudioVisualizer();
    visualizer.initialize();
    visualizer.createBars();
    visualizer.setupAudioProcessing();
    visualizer.handleDrop();  
});


function AudioVisualizer() {
    //constants
    this.numberOfBars = 70;//数目

    //渲染
    this.scene; //场景
    this.camera;  //相机
    this.renderer;  //渲染器
    this.controls;  //控制器

    //bars
    this.bars = new Array();

    //audio
    this.javascriptNode;
    this.audioContext;
    this.sourceBuffer;
    this.analyser;
}

//初始可视化元素
AudioVisualizer.prototype.initialize = function () {
    //初始化ThreeJS场景
    this.scene = new THREE.Scene();

    //获取窗口长宽
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    //获取渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(WIDTH, HEIGHT);

    //添加渲染器
    document.body.appendChild(this.renderer.domElement);

    //创建并加入相机
    this.camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 20000);
    this.camera.position.set(0, 45, 0);
    this.scene.add(this.camera);

    var that = this;

    //更新渲染器大小方向以及投影矩阵
    window.addEventListener('resize', function () {

        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;

        that.renderer.setSize(WIDTH, HEIGHT);

        that.camera.aspect = WIDTH / HEIGHT;
        that.camera.updateProjectionMatrix();

    });

    //背景颜色
    this.renderer.setClearColor(0x333F47, 1);

    //创建光源并添加到场景中
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100, 200, 100);
    this.scene.add(light);

    //使用OrbitControls控制相机视角
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
};

//创建可视化的柱状条
AudioVisualizer.prototype.createBars = function () {

    //循环创建
    for (var i = 0; i < this.numberOfBars; i++) {

        //创建一个柱状条
        var barGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

        //创建材质
        var material = new THREE.MeshPhongMaterial({
            color: this.getRandomColor(),
            ambient: 0x808080,
            specular: 0xffffff
        });

        //创建几何体框架并放到特定位置
        this.bars[i] = new THREE.Mesh(barGeometry, material);
        this.bars[i].position.set(i - this.numberOfBars/2, 0, 0);

        //将长方体放到场景中
        this.scene.add(this.bars[i]);
    }
};

//解析音频信息并添加到渲染场景中
AudioVisualizer.prototype.setupAudioProcessing = function () {
    //获取audiocontext
    this.audioContext = new AudioContext();

    //创建javascript节点
    this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.audioContext.destination);

    //创建音源
    this.sourceBuffer = this.audioContext.createBufferSource();

    //创建分析器
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 512;

    //将音源和分析器连接起来
    this.sourceBuffer.connect(this.analyser);

    //分析器与js节点连接
    this.analyser.connect(this.javascriptNode);

    //分析器与音源连接
    this.sourceBuffer.connect(this.audioContext.destination);

    var that = this;

    //可视化过程
    this.javascriptNode.onaudioprocess = function () {

        // 分析器解析音频频率与音源信息
        var array = new Uint8Array(that.analyser.frequencyBinCount);
        that.analyser.getByteFrequencyData(array);

        //渲染
        visualizer.renderer.render(visualizer.scene, visualizer.camera);
        visualizer.controls.update();

        var step = Math.round(array.length / visualizer.numberOfBars);

        //循环改变不同长方体在z轴上的缩放
        for (var i = 0; i < visualizer.numberOfBars; i++) {
            var value = array[i * step] / 4;
            value = value < 1 ? 1 : value;
            visualizer.bars[i].scale.z = value;
        }
    }

};


//开始音乐处理
AudioVisualizer.prototype.start = function (buffer) {
    this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
    var that = this;

    function decodeAudioDataSuccess(decodedBuffer) {
        that.sourceBuffer.buffer = decodedBuffer
        that.sourceBuffer.start(0);
    }

    function decodeAudioDataFailed() {
        debugger
    }
};

//随机颜色
AudioVisualizer.prototype.getRandomColor = function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

//支持拖拽文件播放
AudioVisualizer.prototype.handleDrop = function () {
    //拖
    document.body.addEventListener("dragenter", function () {
       
    }, false);
    document.body.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);

    document.body.addEventListener("dragleave", function () {
       
    }, false);

    //松开
    document.body.addEventListener("drop", function (e) {
        e.stopPropagation();

        e.preventDefault();

        //得到文件
        var file = e.dataTransfer.files[0];
        var fileName = file.name;

        $("#guide").text("Playing " + fileName);

        var fileReader = new FileReader();

        fileReader.onload = function (e) {
            var fileResult = e.target.result;
            visualizer.start(fileResult);
        };

        fileReader.onerror = function (e) {
          debugger
        };
       
        fileReader.readAsArrayBuffer(file);
    }, false);
}

