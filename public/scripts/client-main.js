let socket = io();

$().ready(function () {
    loadQueueTable();
    loadFileTable();
    loadEventTable();
    loadUtStats();
});

/**
 * All socket opertions
 */

socket.on('torrentQueue', function (data) {
    $('#torrent-table').bootstrapTable('load', data);
});

socket.on('fileQueue', function (data) {
    $('#file-table').bootstrapTable('load', data);
});

socket.on('hearYe', function (data) {
    $('#event-table').bootstrapTable('append', data);
});

socket.on('uTorrentHealth', function (data) {
    $('#uTStats').bootstrapTable('load', data);
});

let loadUtStats = function () {
    $('#uTStats').bootstrapTable({
        cardView: true,
        smartDisplay: true,
        columns: [{
            field: 'online',
            title: 'Online'
        }]
    });
};
let loadQueueTable = function () {
    $('#torrent-table').bootstrapTable({
        cardView: false,
        showToggle: true,
        search: true,
        smartDisplay: true,
        columns: [{
            field: 'QueueOrder',
            title: '#'
        },
        {
            field: 'Name',
            title: 'Name'
        },
        {
            field: 'Status',
            title: 'Status'
        },
        {
            field: 'Hash',
            title: 'Torrent Hash'
        },
        {
            field: 'ETA',
            title: 'ETA (s)'
        },
        {
            field: 'DownSpeed',
            title: 'Download speed (Bps)'
        },
        {
            field: 'UpSpeed',
            title: 'Upload speed (Bps)'
        }],
        detailView: true,
        onExpandRow: function (index, row, $files) {
            $files.html('<table></table>').find('table').bootstrapTable({
                columns: [{
                    field: 'FileName',
                    title: 'Name'
                },
                {
                    field: 'FileSize',
                    title: 'Size'
                },
                {
                    field: 'Downloaded',
                    title: 'Downloaded'
                },
                {
                    field: 'Priority',
                    title: 'Priority'
                }],
                data: row.nested
            });
        },
        // data: [{
        //     QueueOrder: '1',
        //     Name: 'Some Torrent',
        //     Status: 'In Progress',
        //     Hash: '#######################',
        //     ETA: 1234,
        //     DownSpeed: 1234567,
        //     UpSpeed: 1234567,
        //     'nested': [{
        //         FileName: 'test',
        //         Download: 'No'
        //     }]
        // }]
    });
};

let loadFileTable = function () {
    $('#file-table').bootstrapTable({
        columns: [{
            field: 'fileName',
            title: 'File Name'
        },
        {
            field: 'filePath',
            title: 'Local Path'
        }]
    });
};

let loadEventTable = function () {
    $('#event-table').bootstrapTable({
        pagination: true,
        pageSize: 10,
        cardView: false,
        showToggle: true,
        search: true,
        smartDisplay: true,
        showColumns: true,
        columns: [{
            field: 'dateTime',
            title: 'TS',
            sortable: true,
            order: 'desc'
        },
        {
            field: 'isError',
            title: 'Type',
            searchable: true
        }, {
            field: 'message',
            title: 'Message'
        }],
        sortName: 'dateTime',
        sortOrder: 'desc'
    });
};