(function() {
    var autoLink;
    var slice = [].slice;

    autoLink = function() {
        var callback;
        var k;
        var linkAttributes;
        var option;
        var options;
        var pattern;
        var v;
        if (arguments.length > 0) {
            options = slice.call(arguments, 0);
        } else {
            options = [];
        }
        pattern = /(^|[\s\n]|<[A-Za-z]*\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
        if (options.length == 0) {
            return this.replace(pattern, "$1<a href='$2'>$2</a>");
        }
        option = options[0];
        callback = option["callback"];
        linkAttributes = ((function() {
            var results = [];
            for (i in option) {
                if (i !== 'callback') {
                    results.push(" " + i + "='" + option[i] + "'");
                }
            }
            return results;
        })()).join('');


        return this.replace(pattern, function(match, space, url) {
            var link;
            if (typeof callback === "function") {
                link = callback(url);
            } else {
                link = void 0;
            }
            link = link || ("<a href='" + url + "'" + linkAttributes + ">" + url + "</a>");
            // link = (typeof callback === "function" ? callback(url) : void 0) || ("<a href='" + url + "'" + linkAttributes + ">" + url + "</a>");
            var retVal = "" + space + link;
            return retVal;
        });
    };
    String.prototype['autoLink'] = autoLink;
}).call(this);