class ResourcesUnavailableError extends Error {
    constructor(msg, res) {
        super(msg);
        console.error(msg, res);
    }
}
class BuildingInfoError extends Error {
    constructor(msg, buildingInfo) {
        super(msg);
        console.error(msg, buildingInfo);
    }
}
class BlockInfoError extends Error {
    constructor(msg, blockInfo) {
        super(msg);
        console.error(msg, blockInfo);
    }
}

class DataError extends Error {
    constructor(msg, blockInfo) {
        super(msg);
        console.error(msg, blockInfo);
    }
}

class LoadingError extends Error {
    constructor(msg) {
        super(msg);
        console.error(msg);
    }
}

export { BlockInfoError, BuildingInfoError, DataError, LoadingError, ResourcesUnavailableError };
