function init() {
  var canvas = document.getElementById("Canvas");
  var ctx = canvas.getContext("2d");
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
  var Center = { x : canvas.width / 2, y : canvas.height / 2};
  //system
  window.addEventListener("keydown", KeyDown);
  window.addEventListener("keyup", KeyUp);
  window.addEventListener("mousemove", OnMouseMove);
  var OnPress = {};
  var PressedKeys = [];
  let KEYCODES = {
    87 : 'w',
    65 : 'a',
    83 : 's',
    68 : 'd'
  }
  function KeyDown(e) {
    code = KEYCODES[e.keyCode];
    if (!code) {return}
    PressedKeys[code] = OnPress[code];
  }
  function KeyUp(e) {
    delete PressedKeys[KEYCODES[e.keyCode]];
  }
  function OnKey(key, func) {
    OnPress[key] = func;
  }
  MousePos = {
    x : 0,
    y : 0
  }
  function OnMouseMove(e) {
    MousePos.x = e.clientX;
    MousePos.y = e.clientY;
    Light.Position.x = MousePos.x;
    Light.Position.y = MousePos.y;
  }
  OnKey('a', () => {
    Char.Move(-Char.MoveSpeed, 0);
  })
  OnKey('d', () => {
    Char.Move(Char.MoveSpeed, 0);
  })
  OnKey('w', () => {
    Jump();
  })
  OnKey('s', () => {
    console.log(MousePos)
  })
  let ScreenSizeCoef = 50;
  let ScreenSize = { x : 16 * ScreenSizeCoef, y : 9 * ScreenSizeCoef};
  var ClearRectPosition = { x : Center.x - ScreenSize.x / 2, y : Center.y - ScreenSize.y / 2};
  function Render() {
    ctx.clearRect(ClearRectPosition.x, ClearRectPosition.y, ScreenSize.x, ScreenSize.y);
    GameObjectArray.forEach((e) => {
      e.Draw();
    })
  }
  function Update() {
    Debug();
    Controll();
    ApplyPhysics();
    Render();
    requestAnimationFrame(Update);
  }
  function Controll() {
    for(let key in PressedKeys) {
      PressedKeys[key]();
    }
  }
  function GetCollidedArray(Obj, Size, Num) { //obj or coord
    let Arr = [];
    let x, y, Width, Height;
    if (Obj.__proto__.constructor == GameObject) {
      x = Obj.Position.x;
      y = Obj.Position.y;
      Width = Obj.DrawInfo.Radius || Obj.DrawInfo.Width;
      Height = Obj.DrawInfo.Radius || Obj.DrawInfo.Height;
      Num = Obj.Num;
    }
    else {
      x = Obj[0];
      y = Obj[1];
      Width = Size[0];
      Height = Size[1] || Size[0];
    }
    GameObjectArray.forEach((e) => {
      if (!e.DoCollider || e.Num == Num) {
        return;
      }
      let ePx = e.Position.x;
      let ePy = e.Position.y;
      let eWidth = e.DrawInfo.Radius || e.DrawInfo.Width;
      let eHeight = e.DrawInfo.Radius || e.DrawInfo.Height;
      if (x + Width >= ePx && x - Width <= ePx + eWidth && y + Height >= ePy && y + Height <= ePy + eHeight) {
        Arr.push(e);
      }
    })
    return Arr;
  }
  function GetSoulutionFromColArr(ColArr, Chk, Obj, value) {
    let Sol = Infinity;
    value = value >= 0 ? 1 : -1;
    for (var i = 0;i < ColArr.length; i++) {
      let Gap = 0;
      let OP = Obj.Position[Chk];
      let CP = ColArr[i].Position[Chk];
      let OSize = Obj.DrawInfo.Radius || (Chk == 'x' ? Obj.DrawInfo.Width : Obj.DrawInfo.Height);
      let CSize = ColArr[i].DrawInfo.Radius || (Chk == 'x' ? ColArr[i].DrawInfo.Width : ColArr[i].DrawInfo.Height);
      if (Chk == 'x') {
        if (CP < OP) {
          Gap = CP - OP + CSize + OSize + 1;
        }
        else {
          Gap = CP - OP - OSize - 1;
        }
      }
      else {
        if (CP > OP) {
          Gap = CP - OP - OSize - 1;
        }
        else {
          Gap = CP - OP + CSize + OSize + 1; 
        }
      }
      if (Math.abs(Sol) > Math.abs(Gap)) {
        Sol = Gap;
      }
    }
    return Sol;
  }
  function GetSimulatedObjInfo(Obj, Sim) {
    return [[Obj.Position.x + Sim[0], Obj.Position.y + Sim[1]], Obj.DrawInfo.Type == "arc" ? [Obj.DrawInfo.Radius] : [Obj.DrawInfo.Width, Obj.DrawInfo.Height]];
  }
  function CalcPhysics(e) {
    let SimInfo = GetSimulatedObjInfo(e, [0, -1]);
    let ColArr = GetCollidedArray(SimInfo[0], SimInfo[1]);
    if (ColArr.length == 1) {
        e.IsFalling = true;
    }
    e.Velocity.y += Gravity * e.IsFalling;
  }
  function ApplyPhysics() {
    GameObjectArray.forEach((e) => {
      if (!e.isDynamic) {
        return;
      }
      CalcPhysics(e)
      if (!(e.Velocity.x == 0 && e.Velocity.y == 0)) {
        e.Move(e.Velocity.x, e.Velocity.y);
      }
    })
  }
  function GetDrawMethod(ObjC, drawInfo) {
    if (drawInfo.Type == "arc") {
      return () => {
        ctx.beginPath();
        ctx.arc(ObjC.Position.x, ObjC.Position.y, ObjC.DrawInfo.Radius, 0, Math.PI*2);
        ctx.fillStyle = ObjC.DrawInfo.Color;
        ctx.fill();
        ctx.closePath();
      }
    }
    else if (drawInfo.Type == "rect") {
      return () => {
        ctx.beginPath();
        ctx.rect(ObjC.Position.x, ObjC.Position.y, ObjC.DrawInfo.Width, ObjC.DrawInfo.Height);
        ctx.fillStyle = ObjC.DrawInfo.Color;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
  class GameObject {
    constructor(
      positionInfo = [0, 0, "rel"],
      drawInfo,
      MoveInfo = [0, true] //movespeed, docollider
      ){
      if (positionInfo[2] == "rel") {
        if (drawInfo.Type == "arc") {
          this.Position = {
            x : Center.x + positionInfo[0],
            y : Center.y + positionInfo[1]
          }
        }
        else {
          let coef = [
            positionInfo[0] / Math.abs(positionInfo[0]),
            positionInfo[1] / Math.abs(positionInfo[1])
          ]
          coef[0] |= 0;
          coef[1] |= 0;
          this.Position = {
            x : Center.x + (positionInfo[0] + drawInfo.Width / 2 * coef[0]) - drawInfo.Width / 2,
            y : Center.y + (positionInfo[1] + drawInfo.Height / 2 * coef[1]) - drawInfo.Height / 2
          }
        }
      }
      else {
        this.Position = {
          x : positionInfo[0],
          y : positionInfo[1]
        }
      }
      this.Velocity = {
        x : 0,
        y : 0
      }
      this.DrawInfo = [];
      for(let key in drawInfo) {
        this.DrawInfo[key] = drawInfo[key];
      }
      this.Draw = GetDrawMethod(this, drawInfo);
      this.MoveSpeed = MoveInfo[0];
      this.isDynamic = this.MoveSpeed != 0;
      this.DoCollider = MoveInfo[1];
      this.IsFalling = true;

      this.Num = GameObjectArray.length;
      GameObjectArray.push(this);
    }
    Move(x = 0, y = 0) {
      //todo 상대적 크기/포지션
      let SimObjInfo_Y = GetSimulatedObjInfo(this, [0, y]);
      let CollidedArray_Y = GetCollidedArray(SimObjInfo_Y[0], SimObjInfo_Y[1], this.Num);
      if (CollidedArray_Y.length > 0) {
        if (y > 0) {
          this.IsFalling = false;
        }
        this.Velocity.y = 0;
        y = GetSoulutionFromColArr(CollidedArray_Y, 'y', this, y);
      }
      let SimObjInfo_X = GetSimulatedObjInfo(this, [x, 0]);
      let CollidedArray_X = GetCollidedArray(SimObjInfo_X[0], SimObjInfo_X[1], this.Num);
      if (CollidedArray_X.length > 0) {
        this.Velocity.x = 0;
        x = GetSoulutionFromColArr(CollidedArray_X, 'x', this, x);
      }
      this.Position.x += x;
      this.Position.y += y;
    }
    Draw() {}
  }
  //var, func
  function Debug() {
    
  }
  var JumpHeight = 20;
  var Gravity = 0.5;
  function Jump() {
    if (Char.IsFalling) {
      return;
    }
    Char.IsFalling = true;
    Char.Velocity.y -= JumpHeight;
  }
  function NewBlock(pos, size) {
    return new GameObject(pos, {
      Type : "rect",
      Color : "#000000",
      Width : size[0],
      Height : size[1]
    })
  }

  //init
  ctx.fillRect(0, 0, canvas.width, canvas.height); //화면을 검게 한다
  var GameObjectArray = [];
  var Char = new GameObject([0, 0, "rel"], {
    Type : "arc",
    Color : "#0095DD",
    Radius : 10
  }, [5, true]
  );
  Char.Radius = 10;
  var Light = new GameObject(undefined, {
    Type : "arc",
    Color : "rgba(0, 0, 0, 0.1)",
    Radius : 100
  }, [0, false]);
  Walls = [
    NewBlock([0, ScreenSize.y / 2, "rel"], [ScreenSize.x, 100]),
    NewBlock([0, -ScreenSize.y / 2, "rel"], [ScreenSize.x, 100]),
    NewBlock([-ScreenSize.x / 2, 0, "rel"], [100, ScreenSize.y]),
    NewBlock([ScreenSize.x / 2, 0, "rel"], [100, ScreenSize.y])
  ]
  NewBlock([-100, 0, "rel"], [100, 100]);
  //Light.draw //todo 빛
  //code
  var a;
  //repeat
  Update();
}