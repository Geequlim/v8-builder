#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
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
let output = `output/libs/${target_os}_${target_cpu}${flags || ''}`;
fs.mkdirSync(output, { recursive: true });

const ext = is_static ? { win: 'lib' }[target_os] || 'a' : { win: 'dll', mac: 'dylib'}[target_os] || 'so';
const prefix = target_os === 'win' ? '' : 'lib';
fs.writeFileSync(path.join(output, `${prefix}${action}.${ext}`), JSON.stringify(options, undefined, '\t'));
