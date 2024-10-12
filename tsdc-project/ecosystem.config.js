module.exports = {
  apps : [{
    name   : "API_TSDC_PROJECT",
    script : "./server.js",
    error_file : "./log/error.log",
    out_file : "./log/output.log",
    watch  : true,
    instances  : 2,
    exec_mode  : "cluster",
    max_memory_restart  : "300M"
  }]
}
