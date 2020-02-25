export var WebGLAvailability;
(function (WebGLAvailability) {
    WebGLAvailability[WebGLAvailability["Unavailable"] = 0] = "Unavailable";
    WebGLAvailability[WebGLAvailability["Available"] = 1] = "Available";
    WebGLAvailability[WebGLAvailability["WebGL2Available"] = 2] = "WebGL2Available";
})(WebGLAvailability || (WebGLAvailability = {}));
export var BlockType;
(function (BlockType) {
    BlockType["PlaceableBlock"] = "ALL";
    BlockType["BasicBlock"] = "MELEE";
    BlockType["HighBlock"] = "RANGED";
})(BlockType || (BlockType = {}));
export var PositionType;
(function (PositionType) {
    PositionType["Melee"] = "MELEE";
    PositionType["Ranged"] = "RANGED";
    PositionType["All"] = "ALL";
})(PositionType || (PositionType = {}));
export var OverlayType;
(function (OverlayType) {
    OverlayType[OverlayType["PlaceLayer"] = 0] = "PlaceLayer";
    OverlayType[OverlayType["AttackLayer"] = 1] = "AttackLayer";
})(OverlayType || (OverlayType = {}));
export var RarityColor;
(function (RarityColor) {
    RarityColor[RarityColor["White"] = 1] = "White";
    RarityColor[RarityColor["GreenYellow"] = 2] = "GreenYellow";
    RarityColor[RarityColor["DeepSkyBlue"] = 3] = "DeepSkyBlue";
    RarityColor[RarityColor["MediumSlateBlue"] = 4] = "MediumSlateBlue";
    RarityColor[RarityColor["Yellow"] = 5] = "Yellow";
    RarityColor[RarityColor["Orange"] = 6] = "Orange";
})(RarityColor || (RarityColor = {}));
export var Profession;
(function (Profession) {
    Profession["Guard"] = "GUARD";
    Profession["Caster"] = "CASTER";
    Profession["Vanguard"] = "VANGUARD";
    Profession["Medic"] = "MEDIC";
    Profession["Defender"] = "DEFENDER";
    Profession["Sniper"] = "SNIPER";
    Profession["Supporter"] = "SUPPORTER";
    Profession["Specialist"] = "SPECIALIST";
    Profession["Token"] = "TOKEN";
    Profession["Trap"] = "TRAP";
})(Profession || (Profession = {}));
export var GameStatus;
(function (GameStatus) {
    GameStatus["Standby"] = "STANDBY";
    GameStatus["Victory"] = "VICTORY";
    GameStatus["Defeat"] = "DEFEAT";
    GameStatus["Running"] = "RUNNING";
})(GameStatus || (GameStatus = {}));
export const BlockUnit = 10;
