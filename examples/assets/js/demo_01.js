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

  const img = new Image()
  const texSize = {w: 0, w: 0, scale: 0.4, isTextureLoaded: false}
  img.onload = () => {
    texSize.w = img.width
    texSize.h = img.height
    texSize.isTextureLoaded = true 
  }
  img.src = './assets/img/demo_01.png'


  main()

  
  function main(){
    // getMediaData()
    recordBtn.addEventListener('click', () => {
      setRecordState()
    }, false)
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

    ctx.fillStyle = `rgba(${255 - m}, ${255 - m}, ${255 - m}, 1)`
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if(texSize.isTextureLoaded){
      if(m / 100 >= 0.5){
        ctx.globalAlpha = (m / 100) - 0.5
        ctx.drawImage(
          img,
          Math.floor( (canvas.width - canvas.width * texSize.scale)/2 ),
          Math.floor( (canvas.height - (canvas.width * texSize.scale * img.height)/img.width)/2 ),
          Math.floor(canvas.width * texSize.scale),
          Math.floor( (canvas.width * texSize.scale * img.height)/img.width )    // w: h = cW * 0.4: x
        )    
      }
    }
  }


})()