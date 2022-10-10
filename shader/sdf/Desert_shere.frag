#version 330
#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
float noise(vec2 p) {
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}
// https://github.com/dmnsgn/glsl-rotate/blob/main/rotation-3d-x.glsl
mat3 rotation3dX(float angle) {
	float s = sin(angle);
	float c = cos(angle);

	return mat3(
		1.0, 0.0, 0.0,
		0.0, c, s,
		0.0, -s, c
	);
}
mat3 rotation3dY(float angle) {
	float s = sin(angle);
	float c = cos(angle);

	return mat3(
		c, 0.0, -s,
		0.0, 1.0, 0.0,
		s, 0.0, c
	);
}
mat3 rotation3dZ(float angle) {
	float s = sin(angle);
	float c = cos(angle);
	return mat3(
		c, s, 0.0,
		-s, c, 0.0,
		0.0, 0.0, 1.0
	);
}
// https://github.com/glslify/glsl-look-at
mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
	vec3 rr = vec3(sin(roll), cos(roll), 0.0);
	vec3 ww = normalize(target - origin);
	vec3 uu = normalize(cross(ww, rr));
	vec3 vv = (cross(uu, ww)); // normalize

	return mat3(uu, vv, ww);
}

// https://iquilezles.org/articles/distfunctions/
vec2 opUnion( vec2 d1, vec2 d2 ) {
	if (d1.x > d2.x) {
		return d2;
	}
	return d1;
}
vec2 bs_sub(vec2 d1, vec2 d2, float k) { // opSmoothSubtraction
	vec2 h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
	return mix( d2, -d1, h ) + k*h*(1.0-h);
}
//Displacement
vec2 opCheapBend( vec2 p, float k ) {
	float c = cos(k);
	float s = sin(k);
	mat2  m = mat2(c,-s,s,c);
	return m * p.xy;
}
float sdSphere( vec3 p, float s ) {
	return length(p)-s;
}
float sdBox( vec3 p, vec3 b ) {
	vec3 d = abs(p) - b;
	return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

// https://iquilezles.org/articles/smin
vec2 bs_add( float a, float b, float k ) {
	float h = max( k-abs(a-b), 0.0 )/k;
	float m = h*h*0.5;
	float s = m*k*(1.0/2.0);
	return (a<b) ? vec2(a-s,m) : vec2(b-s,1.0-m);
}
// https://github.com/hughsk/glsl-hsv2rgb
vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
vec2 map(vec3 pos) {
	vec2 res = vec2(1.0, -1.0);
	float id;
	vec3 p = pos, p2 = pos;
	float c;
	//Sand
	vec2 sand;
	p.y += (
		sin(p.x * 1.0 + cos(p.z * 0.5) * 1.0) * 0.1
		+ sin(p.z * 1.0 + cos(p.x * 1.5) * 1.0) * 1.0
		+ sin(p.x * 1.0) * p.y * 1.0
		+ sin((p.z + p.x) * 0.8 + 5.0) * 1.5
	) / 2.;
	sand = vec2(p.y, 1.0);
	
	// Hole sand
	p2 = pos;
	c = 2.0;
	p2.z = p2.z - c * round(p2.z / c);
	p2.x = p2.x - c * round(p2.x / c);
	sand = bs_sub(vec2(sdSphere(p2+vec3(0., 0.0, 0.), 0.4), id), sand, 0.8);
	
	// Colored egg
	p2 = pos;
	id = 10.0;
	p2 += vec3(-2.0, -1.0, 5.0);
	p2.xz = opCheapBend( p2.xz, p2.z * 0.07 );
	c = 2.5;
	id = fract(length(p2.xz) * 0.06+0.05) * 40.0 + 10.0;
	p2.z = p2.z - c * clamp(round(p2.z / c), -1., 5.);
	p2.x = p2.x - c * clamp(round(p2.x / c), -3., 2.);
	res = opUnion(res, vec2(sdSphere(p2+vec3(0., 0.0, 0.), 0.5), id));
	
	// Two eggs
	id = 2.0;
	res = opUnion(vec2(sdSphere(pos + vec3(5.0, 0.6, 0.0), 1.3), id), res);
	res = opUnion(vec2(sdSphere(pos + vec3(6.0, -0.6, 2.8), 1.3), id), res);
	res = opUnion(vec2(sdSphere(pos + vec3(3.0, 0.7, 3.5), 1.3), id), res);

	// Big stone
	p2 = pos;
	p2 += vec3(5.0, -3.6, 8.0);
	p2 *= rotation3dZ((30.0 ) * PI / 180.0);
	id = 3.0;
	vec2 cube_sand = bs_add(sdBox(p2, vec3(3.0, 8.0, 1.0)) - 0.1, sand.x, 3.0);
	cube_sand.y = mix(id, sand.y, smoothstep(0.0, 0.0, cube_sand.y));
	res = opUnion(res, cube_sand);
	return res;
}

// https://iquilezles.org/articles/normalsSDF/
vec3 calcNormal(vec3 p) {
	const float h = 0.01;
	vec2 k = vec2(1.0, -1.0)*h;
	return normalize(
			k.xyy * map( p + k.xyy * h ).x + 
			k.yyx * map( p + k.yyx * h ).x + 
			k.yxy * map( p + k.yxy * h ).x + 
			k.xxx * map( p + k.xxx * h ).x );
}
vec2 raycast(vec3 ro, vec3 rd) {
	float t_max = 20.0;
	float t_min = -1.0;
	float t = t_min;
	vec2 h;
	for (int i = 0; i < 150; i++) {
		h = map(ro + rd * t);
		if (h.x < t_min || h.x > t_max || abs(h.x) < (t * 0.0001)) {
			break;
		}
		t += h.x;
	}
	return vec2(t, h.y);
}
// https://iquilezles.org/articles/rmshadows/
float raycast_shadow(vec3 ro, vec3 rd, vec2 td, float k) {
	float t = td.x;
	vec2 h;
	float s = 1.0;
	float ph = 1e20;
	for (; t < td.y; ) {
		h = map(ro + rd * t);
		if (h.x < 0.001) {
			return 0.0;
		}
		float y = h.x * h.x / (2.0 * ph);
		float d = sqrt(h.x * h.x - y * y);
		t += h.x;
		s = min(s, k * d / max(0.0, t - y));
		ph = h.x;
	}
	return s;
}
// https://iquilezles.org/articles/nvscene2008/rwwtt.pdf
float calcAO( in vec3 pos, in vec3 nor ) {
	float occ = 0.0;
	float sca = 1.0;
	for( int i=0; i<5; i++ ) {
		float h = 0.01 + 0.12*float(i)/4.0;
		float d = map( pos + h * nor).x;
		occ += (h-d)*sca;
		sca *= 0.95;
		if( occ>0.35 ) break;
	}
	return clamp( 1.0 - 3.0*occ, 0.0, 1.0 ) * (0.5+0.5*nor.y);
}
void diffuse_sun(in vec3 obj_lig, in vec3 rd, in vec3 pos, in vec3 norm, out float diff, out float spec) {
	diff = clamp(dot(norm, obj_lig), 0.0, 1.0);
	vec3 hal = normalize(obj_lig - rd);
	diff *= raycast_shadow(pos, obj_lig, vec2(1.0, 10.0), 5.5);
	spec = pow(clamp(dot(norm, hal), 0.0, 1.0 ), 5.0) * diff;
}
void diffuse_ambient(in vec3 rd, in float ao, in vec3 pos, in vec3 norm, out float diff, out float spec) {
	vec3 ref = reflect(rd, norm);
	diff = sqrt(clamp(0.5 + 0.5 * norm.y, 0.0, 1.0));
	diff *= ao;
	spec = smoothstep(-2.0, 0.2, ref.y) * diff;
	spec *= pow(clamp(1.0 + dot(norm, rd), 0.0, 1.0), 5.0);
	spec *= raycast_shadow(pos, ref, vec2(1.0, 10.0), 5.5);
}
vec3 render(vec3 ro, vec3 rd) {
	vec3 col = vec3(0.0);
	vec3 col_mat, col_mat_spe, col_base;
	float tex;

	const vec3 obj_lig = normalize(vec3(5.0, 10.6, -1.0));
	const vec3 obj_lig_col = vec3(0.85, 0.98, 1.0);
	vec2 obj = raycast(ro, rd);
	vec3 col_sky = mix(vec3(0., 0.60, 1.0), vec3(0.1, 0.01, 1.0), smoothstep(0., 1., rd.y));
	col_sky = mix(vec3(0.96, 0.96, 1.0), col_sky, smoothstep(-0.1, 0.4, rd.y));
	col = col_sky;
	
	vec3 pos = ro + rd * obj.x;
	vec3 norm = calcNormal(pos);
	float diff;
	float spec;
	diffuse_sun(obj_lig, rd, pos, norm, diff, spec);

	float diff_cloud;
	float spec_cloud;
	diffuse_ambient(rd, calcAO(pos, norm), pos, norm, diff_cloud, spec_cloud);
	
	if (obj.y == 1.0) {
		diffuse_ambient(rd, 0.5, pos, norm, diff_cloud, spec_cloud);
		col_base = vec3(0.8, 0.5, 0.3);
		tex = smoothstep(-2., 2.0, rand(abs(pos.xz)));
		col_mat = col_base * (tex + noise(pos.xz * 0.5)) / 2.;
		col_mat_spe = col_base * tex;
		col = col_base * 0.3;
		col += col_mat * obj_lig_col * diff * 3.0;
		col += col_mat_spe * obj_lig_col * spec * 0.8;
		col += col_mat * col_sky * diff_cloud * 0.9;
		col += col_mat_spe * col_sky * spec_cloud * 2.0;
	} else if (obj.y == 2.0) {
		//col_base = vec3(1., 0.5, 0.0);
		col_base = hsv2rgb(vec3(0.6, 0.9, 0.6));
		col_mat = col_base;
		col_mat_spe = col_base;
		col = col_base * 0.2;
		col += col_mat * obj_lig_col * diff * 2.0;
		col += col_mat_spe * obj_lig_col * spec * 1.0;
		col += col_mat * col_sky * diff_cloud * 0.6;
		col += col_mat_spe * col_sky * spec_cloud * 2.0;
	} else if (obj.y == 3.0) {
		tex = smoothstep(-2., 2.0, rand(abs(pos.xz)));
		col_base = hsv2rgb(vec3(0.6, 0.4, 0.9));
		col_mat = col_base * tex;
		col_mat_spe = col_base;
		col = col_base * 0.3;
		col += col_mat * obj_lig_col * diff * 2.0;
		col += col_mat_spe * obj_lig_col * spec * 1.0;
		col += col_mat * col_sky * diff_cloud * 0.6;
		col += col_mat_spe * col_sky * spec_cloud * 2.0;
	} else if (obj.y >= 10.0 && obj.y < 50.0) {
		col_base = hsv2rgb(vec3(smoothstep(10.0, 50.0, obj.y), 0.7, 0.9));
		tex = smoothstep(-2., 2.0, rand(abs(pos.xz)));
		col_mat = col_base;
		col_mat_spe = col_base;
		col = col_base * 0.3;
		col += col_mat * obj_lig_col * diff * 0.8;
		col += col_mat_spe * obj_lig_col * spec * 0.8;
		col += col_mat * col_sky * diff_cloud * 0.4;
		col += col_mat_spe * col_sky * spec_cloud * 1.0;
	}
	col = mix(col, col_sky, smoothstep(80.0, 90.0, length(pos.xz - ro.xz)));
	col = mix(col, col_sky, smoothstep(100.0, 200.0, ro.y));
	return col;
}

void main (void) {
	vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.y, u_resolution.x);
	vec2 muv = (u_mouse.xy / u_resolution.xy * 2.0) - 1.0;
	//Camera Position
	vec3 ro = vec3(5.0, 7.0, 5.0);
	vec3 ta = ro+vec3(0.0, 0.0, 1.0);
	mat3 ca = calcLookAtMatrix(ro, ta, 0.0);
	float ca_a = u_resolution.x / u_resolution.y;
	float ca_d = 1.0 / tan(0.5 * 50.0 * PI / 180.);
	ca[0][0] *= ca_d / ca_a;
	ca[1][1] *= ca_d;
	
	// Camera Rotation
	ca = ca * rotation3dX((-15.0) * PI / 180.0) * rotation3dY(muv.x * 180.0 * PI / 180.0);
	vec3 rd = normalize(vec3(uv, 2.5) * ca);
	
	vec3 col = render(ro, rd);
	gl_FragColor = vec4(col, 1.0);
}
