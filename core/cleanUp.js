let noOp = () => {};

exports.Cleanup = (callback) => {

    // attach user callback to the process event emitter
    // if no callback, it will still exit gracefully on Ctrl-C
    callback = callback || noOp;
    process.on('cleanup', callback);

    // do app specific cleaning before exiting
    process.on('exit', (code) => {
        console.info(`Process exiting with code: ${code}`);
    });

    // catch ctrl+c event and exit normally
    process.on('SIGINT', function () {
        console.log('Ctrl-C pressed \n');
        process.emit('cleanup');
    });

    //catch uncaught exceptions, trace, then exit normally
    process.on('uncaughtException', function (e) {
        console.log('Uncaught Exception...');
        console.log(e.stack);
        process.exit(99);
    });
};