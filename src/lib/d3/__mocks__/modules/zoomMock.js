// D3 Zoom Mock
import * as jest from 'jest-mock';

class MockZoomTransform {
    constructor(k = 1, x = 0, y = 0) {
        this.k = k;
        this.x = x;
        this.y = y;
    }

    toString() {
        return `translate(${this.x},${this.y}) scale(${this.k})`;
    }

    scale(k) {
        return new MockZoomTransform(this.k * k, this.x, this.y);
    }

    translate(x, y) {
        return new MockZoomTransform(this.k, this.x + this.k * x, this.y + this.k * y);
    }

    apply(point) {
        return [point[0] * this.k + this.x, point[1] * this.k + this.y];
    }

    invert(point) {
        return [(point[0] - this.x) / this.k, (point[1] - this.y) / this.k];
    }

    rescaleX(x) {
        return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
    }

    rescaleY(y) {
        return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
    }

    invertX(x) {
        return (x - this.x) / this.k;
    }

    invertY(y) {
        return (y - this.y) / this.k;
    }
}

class MockZoom {
    constructor() {
        this._scaleExtent = [0, Infinity];
        this._translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]];
        this._extent = [[0, 0], [960, 500]];
        this._filter = null;
        this._touchable = true;
        this._wheelDelta = null;
        this._clickDistance2 = 0;
        this._duration = 250;
        this._interpolate = null;
        this._listeners = new Map();

        // Mock functions for tracking calls
        this._transform = jest.fn();
        this._event = jest.fn();
    }

    scaleExtent(extent) {
        if (!arguments.length) return this._scaleExtent;
        this._scaleExtent = extent;
        return this;
    }

    translateExtent(extent) {
        if (!arguments.length) return this._translateExtent;
        this._translateExtent = extent;
        return this;
    }

    extent(extent) {
        if (!arguments.length) return this._extent;
        this._extent = extent;
        return this;
    }

    filter(filter) {
        if (!arguments.length) return this._filter;
        this._filter = filter;
        return this;
    }

    touchable(touchable) {
        if (!arguments.length) return this._touchable;
        this._touchable = touchable;
        return this;
    }

    wheelDelta(delta) {
        if (!arguments.length) return this._wheelDelta;
        this._wheelDelta = delta;
        return this;
    }

    clickDistance(distance) {
        if (!arguments.length) return Math.sqrt(this._clickDistance2);
        this._clickDistance2 = distance * distance;
        return this;
    }

    duration(duration) {
        if (!arguments.length) return this._duration;
        this._duration = duration;
        return this;
    }

    interpolate(interpolate) {
        if (!arguments.length) return this._interpolate;
        this._interpolate = interpolate;
        return this;
    }

    on(typenames, callback) {
        if (callback === undefined) return this._listeners.get(typenames);
        if (callback === null) this._listeners.delete(typenames);
        else this._listeners.set(typenames, callback);
        return this;
    }

    transform(selection, transform) {
        this._transform(selection, transform);
        return this;
    }

    translateBy(selection, x, y) {
        const transform = new MockZoomTransform(1, x, y);
        return this.transform(selection, transform);
    }

    translateTo(selection, x, y) {
        const transform = new MockZoomTransform(1, x, y);
        return this.transform(selection, transform);
    }

    scaleBy(selection, k) {
        const transform = new MockZoomTransform(k, 0, 0);
        return this.transform(selection, transform);
    }

    scaleTo(selection, k) {
        const transform = new MockZoomTransform(k, 0, 0);
        return this.transform(selection, transform);
    }
}

export const zoom = () => new MockZoom();
export { MockZoomTransform };
