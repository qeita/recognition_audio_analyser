(() => {
  const video = document.getElementById('video')
  const canvas = document.getElementById('canvas')
  const recordBtn = document.getElementById('record')

//   const medias = {audio: false, video: {}}
  const medias = {audio: true, video: {}}
  let localMediaStream = null
  let isRun = false
  const isMuted = true

  const ctx = canvas.getContext('2d')
  let audioCtx, sourceNode, analyserNode, gainNode
  let baseVal = 0

  const videoSize = {w: 0, h: 0, aspect: 0}

  const img1 = new Image()
  const img2 = new Image()
  const texSize = [
    {w: 0, h: 0, scale: 0.2, isTextureLoaded: false},
    {w: 0, h: 0, scale: 0.2, isTextureLoaded: false}
  ]
  let audioBuffer = {1: null, 2: null, 3: null}
  let isAudioRun = false


  main()

  
  function main(){
    // getMediaData()
    loadTexture()
    recordBtn.addEventListener('click', () => {
      setRecordState()
    }, false)
  }

  /**
   * テクスチャ読み込み
   */
  function loadTexture(){
    img1.onload = () => {
      texSize[0].w = img1.width
      texSize[0].h = img1.height
      texSize[0].isTextureLoaded = true
    }
    img1.src = './assets/img/demo_02/fig_01.png'      

    img2.onload = () => {
      texSize[1].w = img2.width
      texSize[1].h = img2.height
      texSize[1].isTextureLoaded = true
    }
    img2.src = './assets/img/demo_02/fig_02.png'         
  }

  /**
   * START/STOPボタンの切替、外部オーディオ取得/停止の切り替え
   */
  function setRecordState(){
    isRun = !isRun
    if(isRun){
      recordBtn.textContent = 'STOP'
      getMediaData()
    }else{
      recordBtn.textContent = 'START'
      stop()
    }
  }

  /**
   * オーディオデバイスのアクセス
   */
  function getMediaData(){
    navigator.mediaDevices.getUserMedia(medias)
      .then( mediaStreamSuccess )
      .catch( mediaStreamFailed )
  }

  /**
   * オーディオデバイスアクセス成功時のコールバック
   * @param {object} stream - ストリーム情報 
   */
  function mediaStreamSuccess(stream){
    localMediaStream = stream
    video.srcObject = localMediaStream

    setupAudio()

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // setSize()
    }, false)

    video.addEventListener('loadedmetadata', () => {
      // videoSize.w = video.videoWidth
      // videoSize.h = video.videoHeight
      // videoSize.aspect = videoSize.w / videoSize.h
      // setSize()
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      requestAnimationFrame( draw )
    }, false)
  }

  /**
   * オーディオデバイスアクセス失敗時のコールバック
   * @param {object} err - エラー情報
   */
  function mediaStreamFailed(err){
    console.log(err)
  }

  /**
   * オーディオ取得停止
   */
  function stop(){
    const stream = video.srcObject
    const tracks = stream.getTracks()

    tracks.forEach( (track) => {
      track.stop()
    })
    baseVal = 0
    video.srcObject = null
  }

  /**
   * Canvasサイズ設定(ウェブカム映像をそのまま投影する場合に使用)
   */
  function setSize(){
    const _aspect = window.innerWidth / window.innerHeight

    if(_aspect >= videoSize.aspect){
      canvas.width = window.innerWidth
      canvas.height = Math.floor(canvas.width * videoSize.h / videoSize.w) // cW : cH = vW: vH
    }else{
      canvas.height = window.innerHeight
      canvas.width = Math.floor(canvas.height * videoSize.w / videoSize.h) // cW : cH = vW: vH
    }
    // https://stackoverflow.com/questions/47742208/horizontally-flipping-getusermedias-webcam-image-stream
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }

  /**
   * Web Audio APIの初期設定
   */
  function setupAudio(){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    sourceNode = audioCtx.createMediaStreamSource(localMediaStream)
    analyserNode = audioCtx.createAnalyser()  
    analyserNode.fftSize = 2048
    gainNode = audioCtx.createGain()
    if(isMuted) gainNode.gain.value = 0
    sourceNode.connect(analyserNode)
    analyserNode.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    // analyserNode.connect(audioCtx.destination)
  }

  function getAudioBuffer(index, url, callback){
    const req = new XMLHttpRequest()
    req.responseType = 'arraybuffer'

    req.onreadystatechange = () => {
      if(req.readyState === 4){
        if(req.status === 0 || req.status === 200){
          audioCtx = new (window.AudioContext || window.webkitAudioContext)()
          audioCtx.decodeAudioData(req.response, (buffer) => {
            audioCtx = null
            audioBuffer[ index ] = buffer
            if(callback) callback(buffer)
          })
        }
      }      
    }

    req.open('GET', url, true)
    req.send('')
  }

  function draw(){
    drawCanvas()
    requestAnimationFrame( draw )
  }

  function drawCanvas(){
    // ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const array = new Uint8Array(analyserNode.fftSize)
    analyserNode.getByteTimeDomainData(array)
    const heightArray = []

    for(let i = 0; i < analyserNode.fftSize; ++i){
      const v = array[i]
      const percent = v / 255
      const height = canvas.height * percent
      heightArray.push( height )
    }

    if(!baseVal){
      for(let i = 0, cnt = heightArray.length; i < cnt; i++){
        baseVal += heightArray[i]
      }
      baseVal = Math.floor(baseVal / heightArray.length) 
    }
    // console.log(baseVal)

    let m = Math.max(...heightArray)
    // console.log(m)
    m = Math.floor((m - baseVal)/5)
    // console.log(m)

    addMedia(m)
  }

  function addMedia(m){
    if(isAudioRun) return

    function play(buffer){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      let source = audioCtx.createBufferSource()
      source.buffer = buffer
      source.connect(audioCtx.destination)

      source.start(0)

      source.onended = () => {
        isAudioRun = false
        audioCtx = null
        source.onended = null
        source = null
      }
    }

    if(m >= 50 && m < 80){
      isAudioRun = true
      if(audioBuffer[1]){
        play(audioBuffer[1])
      }else{
        getAudioBuffer(
          1,
          './assets/audio/demo_02/audio_01.mp3',
          play
        )      
      }
    }else if(m >= 80 && m < 110){
      isAudioRun = true
      if(audioBuffer[2]){
        play(audioBuffer[2])
      }else{
        getAudioBuffer(
          2,
          './assets/audio/demo_02/audio_02.mp3',
          play
        )
      }          
    }else if(m >= 110){
      isAudioRun = true
      if(audioBuffer[3]){
        play(audioBuffer[3])
      }else{
        getAudioBuffer(
          3,
          './assets/audio/demo_02/audio_03.mp3',
          play
        )
      }          
    }

    drawTexture(m)
  }

  function drawTexture(m){
    let index = 0, target = img1
    if(m >= 50){
      index = 1
      target = img2
    }

    ctx.drawImage(
      target,
      Math.floor( (canvas.width - 310)/2 ),
      Math.floor( (canvas.height - 351)/2 ),
      310,
      351
    )  
  }


})()