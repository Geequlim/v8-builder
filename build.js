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
        try {
            child_process.execSync(cmd, { stdio: 'inherit' });
        } catch (error) {
            console.error(error);
            process.exit(error.status || 1);
        }
    }
}

// -------------------- Detect and configure build target --------------------

let [ _node, _script, target_os, target_cpu, lib_type, flags ] = process.argv;
if (flags) {
    if (target_os === 'win') {
        flags = target_os === 'win' && flags === 'MD' ? 'MD' : '';
    }
}

const is_static = target_os === 'ios' || (lib_type === 'dynamic' ? false : true)
const options = {
    is_debug: false,
    is_component_build: !is_static,
    is_clang: (target_os === 'win' && is_static) ? false : true,

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
let output = `output/libs/${target_os}_${target_cpu}${flags || ''}`;
fs.mkdirSync(output, { recursive: true });

// -------------------- Apply patches for target --------------------
function apply_patches() {
    function replace(file, src, content) {
        let text = fs.readFileSync(file, 'utf-8')
        text = text.replace(src, content)
        fs.writeFileSync(file, text, 'utf-8');
    }

    if (target_os === 'win') {
        if (is_static) {
            replace('BUILD.gn', /v8_source_set\("v8_heap_base_headers"\) {/, 'v8_header_set("v8_heap_base_headers") {');
        }
        if (flags === 'MD') {
            replace('build\\config\\win\\BUILD.gn', /configs\s?=\s?\[\s?\"\:static_crt\"\s?\]/gm, 'configs = [ ":dynamic_crt" ]');
        }
    }
}
apply_patches();

// -------------------- Build target with GN --------------------
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


// -------------------- Copy libs to output --------------------
let libs = [];
const ext = is_static ? { win: 'lib' }[target_os] || 'a' : { win: 'dll', mac: 'dylib'}[target_os] || 'so';
const prefix = target_os === 'win' ? '' : 'lib';

function addlib(name, dir = '.', outdir = '.') {
    let src = path.join(`${dir}/${prefix}${name}.${ext}`);
    if (!is_static) {
        if (target_os === 'win') {
            let pdb = src + ".pdb";
            libs.push({ name: `${name}.pdb`, src: pdb, outdir });
            let lib = src + ".lib";
            libs.push({ name: `${name}.lib`, src: lib, outdir });
        } else if (target_os === 'android') {
            src = path.join(`${dir}/${prefix}${name}.cr.${ext}`);
        }
    }
    libs.push({ name, src, outdir });
}

if (is_static) {
    addlib('v8_monolith', 'obj');
} else {
    for (const entry of fs.readdirSync(`out.gn/${target}`)) {
        const src = path.join(`out.gn/${target}`, entry);
        if (entry.endsWith(`.${ext}`) && fs.statSync(src).isFile()) {
            const name = entry.substring(prefix.length, entry.indexOf('.'));
            addlib(name);
        }
    }
}

libs.map(lib => {
    const src = `out.gn/${target}/${lib.src}`;
    const file = path.join(output, lib.outdir, `${path.basename(lib.src)}`);
    if (fs.existsSync(src)) {
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
        fs.copyFileSync(src, file);
        console.log(`copy ${src} ==> ${file}`);
    } else {
        console.warn(`copy ${src} ==> ${file} failed`);
    }
});
