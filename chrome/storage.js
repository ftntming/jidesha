
/**
* To prevent data loss from browser/extension crash all recording will be stored
* in an IndexedDB and every time the extension loads (at browser load) it will
* check for last session data.
*/
var Storage = {

    db: null,
    currentIdx: 0,

    initializeDb: function() {
        var me = Storage;
        var dbVersion = 1;

        var createObjectStore = function (dataBase) {
            // Create an objectStore
            console.log("Creating objectStore")
            dataBase.createObjectStore("recording");
        };

        var request = indexedDB.open("UbityMeet", dbVersion);

        request.onerror = function (e) {
            console.log("Error creating/accessing IndexedDB database", e);
        };

        request.onsuccess = function (e) {
            console.log("Success creating/accessing IndexedDB database", e);
            me.db = request.result;

            // Browser/Extension crash failover
            // Check if there is any data from last session
            Storage.saveStorageToFile();

            me.db.onerror = function (e) {
                console.log("Error creating/accessing IndexedDB database", e);
            };

            // Interim solution for Google Chrome to create an objectStore. Will be deprecated
            if (me.db.setVersion) {
                if (me.db.version != dbVersion) {
                    var setVersion = me.db.setVersion(dbVersion);
                    setVersion.onsuccess = function () {
                        createObjectStore(me.db);
                    };
                }
            }
        };

        // For future use. Currently only in latest Firefox versions
        request.onupgradeneeded = function (event) {
            createObjectStore(event.target.result);
        };

    },

    storeBlob: function(blob){
        //console.log("Putting blob in IndexedDB");

        // Open a transaction to the database
        var transaction = Storage.db.transaction(["recording"],"readwrite");

        // Put the blob into the dabase
        var put = transaction.objectStore("recording").put(blob,
            "blob_" + Storage.currentIdx);
        var put = transaction.objectStore("recording").put(Storage.currentIdx,
            "index");

        Storage.currentIdx++;
    },


    clearStorage: function(){
        Storage.db.transaction(['recording'], 'readwrite')
            .objectStore('recording').clear();
        Storage.currentIdx = 0;
    },

    saveStorageToFile: function(filename){
        var transaction = Storage.db.transaction(["recording"], "readonly");

        var chunks = [];
        var currIdx = 0;
        var maxIdx = 0;

        transaction.objectStore("recording").get("index")
            .onsuccess = function (e) {
                var idx = e.target.result
                console.log("Got idx!", idx);
                if (typeof idx !== 'undefined' && idx > 0) {
                    maxIdx = idx;
                    getChunks();
                }
            };



        function getChunks(){
            if (currIdx > maxIdx ) {
                saveChunks();
                return;
            }
            transaction.objectStore("recording").get("blob_" + currIdx)
                .onsuccess = function (e) {
                    var blob = e.target.result;
                    //console.log("Got blob!", blob);
                    chunks.push(blob);
                    currIdx++;
                    getChunks();
                };
        }

        function saveChunks(){
            var blob = new Blob(chunks, {type: 'video/webm'});
            saveFileAs(blob, filename ? filename : "UbityMeet-RECOVERED.webm");
            Storage.clearStorage();
        }


    }
};


/**
* Make sure everything is initialized...
*/
Storage.initializeDb();
