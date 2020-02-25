class MapLoader {
    constructor(onLoad, onError) {
        this.onLoad = onLoad;
        this.onError = onError;
    }

    load(data) {
        if (typeof data === 'string') {
            fetch(data)
              .then((dataResp) => dataResp.json())
              .then((info) => {
                  if (this.onLoad !== undefined) {
                      this.onLoad(info);
                  }
              })
              .catch((reason) => {
                  if (this.onError !== undefined) {
                      this.onError(reason);
                  }
              });
        } else if (this.onLoad !== undefined) {
            this.onLoad(data);
        }
    }
}
export default MapLoader;
