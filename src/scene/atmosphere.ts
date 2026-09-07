import { BackSide, Group, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import type { AtlasPalette } from './palette'
import type { TimeOfDay } from '../types'

export function createAtmosphere(palette: AtlasPalette) {
  const uniforms = {
    zenith: { value: palette.water.clone().lerp(palette.sky, .58) },
    horizon: { value: palette.sky.clone() },
    glow: { value: palette.window.clone() },
    sunDirection: { value: new Vector3(-.7, .25, -.35).normalize() },
    daylight: { value: 1 },
    clock: { value: 0 },
  }
  const material = new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false, toneMapped: false, uniforms,
    vertexShader: `varying vec3 direction;
      void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 direction;
      uniform vec3 zenith, horizon, glow, sunDirection;
      uniform float daylight, clock;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),
                   mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);
      }
      void main() {
        vec3 d = normalize(direction);
        float height = max(d.y, 0.0);
        vec3 colour = mix(horizon, zenith, pow(height, .45));
        vec2 p = d.xz / (height + .3) * 3.5 + vec2(clock * .006, 0.0);
        float clouds = noise(p)*.65 + noise(p*2.1)*.25 + noise(p*4.3)*.1;
        clouds = smoothstep(.50,.72,clouds) * smoothstep(.02,.2,height) * daylight;
        colour = mix(colour, horizon, clouds * .85);
        float sun = pow(max(dot(d,sunDirection),0.0),180.0);
        colour += glow * sun * daylight * .3;
        gl_FragColor = vec4(colour,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const geometry = new SphereGeometry(850, 24, 16)
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = -10
  const root = new Group()
  root.name = 'atmospheric-sky'
  root.add(mesh)
  return {
    root,
    setTime(time: TimeOfDay) {
      const night = time === 'night'
      uniforms.zenith.value.copy(night ? palette.night : palette.water).lerp(palette.sky, night ? .035 : time === 'day' ? .08 : .18).multiplyScalar(night ? 1 : .7)
      uniforms.horizon.value.copy(night ? palette.night : palette.sky).lerp(night ? palette.water : palette.sandstone, night ? .06 : time === 'golden' ? .55 : .08).multiplyScalar(night ? 1 : .8)
      uniforms.daylight.value = night ? 0 : 1
      uniforms.sunDirection.value.set(-.7, time === 'day' ? .75 : .18, -.35).normalize()
    },
    update(position: Vector3, elapsed: number) {
      root.position.copy(position)
      uniforms.clock.value = elapsed
    },
    dispose() { root.removeFromParent(); geometry.dispose(); material.dispose() },
  }
}
