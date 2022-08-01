#!/usr/bin/env node
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

function execute(commands) {
    if (!Array.isArray(commands)) {
        commands = [ commands ];
    }
    for (const cmd of commands) {
        console.log(cmd);
        child_process.execSync(cmd, { stdio: 'inherit' });
    }
}

const [ _node, _script, target_os, target_cpu, lib_type, win_crt ] = process.argv;
const is_static = lib_type === 'dynamic' ? false : true;

const options = {
    is_clang: target_os === 'win' ? false : true,
    is_debug: false,
    is_component_build: !is_static,

    target_os,
    target_cpu,
    symbol_level: 0,
    strip_debug_info: true,
    use_custom_libcxx: target_os === 'android' ? true : false,
    use_custom_libcxx_for_host: target_os === 'android' ? true : undefined,
    use_goma: target_os === 'android' ? false : undefined,
    treat_warnings_as_errors: false,

    v8_target_cpu: target_cpu,
    v8_monolithic: is_static,
    v8_static_library: is_static,
    v8_enable_i18n_support: false,
    v8_use_external_startup_data: false,
    v8_enable_pointer_compression: false,

    enable_ios_bitcode: target_os === 'ios' ? false : undefined,
    ios_enable_code_signing: target_os === 'ios' ? false : undefined,
    ios_deployment_target: target_os === 'ios' ? 10 : undefined,
};

let action = is_static ? 'v8_monolith' : 'v8';
let target = `${target_cpu}.release`;
let output = `output/libs/${target_os}_${target_cpu}${win_crt==='MD' ? '_md' : ''}`;
let libs = [];

function addlib(name, dir = '.', outdir = '.') {
    let ext = '';
    const prefix = target_os === 'win' ? '' : 'lib';
    if (is_static) {
        ext = target_os === 'win' ? 'lib' : 'a';
    } else {
        switch (target_os) {
            case 'osx':
                ext = 'dylib';
                break;
            case 'win':
                ext = 'dll';
                break;
            default:
                ext = 'so';
                break;
        }
    }
    const src = path.join(`${dir}/${prefix}${name}.${ext}`);
    libs.push({ name, src, outdir });
    if (target_os === 'win' && !is_static) {
        if (fs.existsSync(src + '.pdb')) libs.push({ name: `${name}.pdb`, src: src + '.pdb', outdir });
        if (fs.existsSync(src + '.lib')) libs.push({ name: `${name}.lib`, src: src + '.lib', outdir });
    }
}

if (is_static) {
    addlib('v8_monolith', 'obj');
} else {
    addlib('v8')
    addlib('v8_libbase')
    addlib('v8_libplatform')
    if (target_os === 'win') {
        addlib('zlib')
    } else {
        addlib('chrome_zlib')
    }
}

if (win_crt === 'MD') {
    const build = 'build\\config\\win\\BUILD.gn';
    var lines = fs.readFileSync(build, 'utf-8').split(/[\n\r]/);
    for(var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].replace("configs = [ \":static_crt\" ]", "configs = [ \":dynamic_crt\" ]");
    }
    fs.writeFileSync(build, lines.join('\n'), 'utf-8');
}

let args = Object.entries(options).map(pair => {
    let key = pair[0];
    let value = pair[1];
    if (typeof value === 'string') {
        value = JSON.stringify(value);
    } else if (typeof value === 'undefined') {
        return '';
    }
    return `${key} = ${value}`;
});

execute([
    target_os === 'win' ?
        `gn gen out.gn\\${target} -args="${args.map(item => item.replace(/"/g, '""')).join(' ')}"`:
        `python ./tools/dev/v8gen.py ${target} -vv -- '${args.join('\n')}'`,
    `ninja -C out.gn/${target} -t clean`,
    `ninja -C out.gn/${target} ${action}`
]);

fs.mkdirSync(output, { recursive: true });
libs.map(lib => {
    const file = path.join(output, lib.outdir, `${path.basename(lib.src)}`);
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    fs.copyFileSync(`out.gn/${target}/${lib.src}`, file);
});
