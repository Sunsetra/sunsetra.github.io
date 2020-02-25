import { Color, Texture, Vector2 } from '../../lib/three/build/three.module.js';

class Overlay {
    constructor(map, depth, parent) {
        this.map = map;
        this.depth = depth;
        this.parent = parent;
        this.visible = false;
        this.enableArea = [];
    }

    get visibility() {
        return this.visible;
    }

    setOverlayStyle(style) {
        this.map.getBlocks().forEach((block) => {
            if (block !== null && block.overlay !== undefined) {
                const mesh = block.overlay.get(this.depth);
                if (mesh !== undefined) {
                    if (style instanceof Texture) {
                        mesh.material.map = style;
                    } else {
                        mesh.material.color = new Color(style);
                    }
                }
            }
        });
    }

    has(x, y) {
        const pos = x instanceof Vector2 ? x : new Vector2(x, y);
        for (let i = 0; i < this.enableArea.length; i += 1) {
            if (this.enableArea[i].equals(pos)) {
                return true;
            }
        }
        return false;
    }

    show() {
        if (!this.visible) {
            for (let i = 0; i < this.enableArea.length; i += 1) {
                const block = this.map.getBlock(this.enableArea[i]);
                if (block !== null && block.overlay !== undefined) {
                    const mesh = block.overlay.get(this.depth);
                    if (mesh !== undefined) {
                        mesh.visible = true;
                    }
                }
            }
            this.visible = true;
        }
    }

    showArea(center, area) {
        area.forEach((point) => {
            const newPos = new Vector2().addVectors(center, point);
            this.setOverlayVisibility(newPos, true);
        });
    }

    hide() {
        if (this.visible !== false) {
            for (let i = 0; i < this.enableArea.length; i += 1) {
                const block = this.map.getBlock(this.enableArea[i]);
                if (block !== null && block.overlay !== undefined) {
                    const mesh = block.overlay.get(this.depth);
                    if (mesh !== undefined) {
                        mesh.visible = false;
                    }
                }
            }
            this.visible = false;
        }
    }

    setOverlayVisibility(a, b, c) {
        let pos;
        if (typeof a === 'number') {
            if (typeof b === 'number') {
                pos = new Vector2(a, b);
            } else {
                pos = new Vector2(a, 0);
            }
        } else {
            pos = a;
        }
        if (this.has(pos)) {
            const block = this.map.getBlock(pos);
            if (block !== null && block.overlay !== undefined) {
                const mesh = block.overlay.get(this.depth);
                if (typeof b === 'boolean' && mesh !== undefined) {
                    mesh.visible = b;
                    this.updateVisibility(b);
                } else if (c !== undefined && mesh !== undefined) {
                    mesh.visible = c;
                    this.updateVisibility(c);
                }
            }
        }
    }

    setEnableArea(area) {
        this.hide();
        this.enableArea = area;
    }

    updateVisibility(state) {
        for (let i = 0; i < this.enableArea.length; i += 1) {
            const block = this.map.getBlock(this.enableArea[i]);
            if (block !== null && block.overlay !== undefined) {
                const mesh = block.overlay.get(this.depth);
                if (mesh !== undefined && mesh.visible === !state) {
                    this.visible = null;
                    return;
                }
            }
        }
        this.visible = state;
    }
}

export default Overlay;
