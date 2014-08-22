'use strict';

var _ = require('lodash'),
    hash = require('es-hash'),
    css = require('css'),
    path = require('path'),
    mime = require('mime'),
    CleanCSS = require('clean-css'),
    fs = require('fs'),
    read = fs.readFileSync,
    opts = {
        strict: false, // strict compare (compares base64 images to files if set to false)
        cwd: process.cwd()
    };

//var optimize = Promise.promisify(SVGO.optimize);

/**
 * Build prefix string from selector hierarchy
 * e.g. prefix with media...
 * @param rule
 * @returns {string}
 */
function getPrefix(rule) {
    var prefixes = [];

    // add parent prefixes if applicable
    if (rule.parent) {
        var parentPrefix = getPrefix(rule.parent);
        if (parentPrefix) {
            prefixes.push(parentPrefix);
        }
    }

    // add type
    prefixes.push(rule.type);

    // add type value
    if (rule.hasOwnProperty(rule.type) && _.isString(rule[rule.type])) {
        prefixes.push(rule[rule.type]);
    }

    var result = prefixes.join('-');
    if (rule.type === 'rule') {
        result += ' ';
    }

    return result;
}

/**
 * cleanup xml data
 *
 * @param xmldata
 * @returns {*}
 */
function cleanXMLData(xmldata) {
    // remove linebreaks
    xmldata = xmldata.replace(/(\r\n|\n|\r)/gm,'');
    // removes xml comments
    xmldata = xmldata.replace(/<!--[^>]*-->/g, '');
    // remove double whitespace
    xmldata = xmldata.replace(/\s/g, ' ');
    xmldata = xmldata.replace(/\s{2,}/g, ' ');
    // changes '' to ""
    xmldata = xmldata.replace(/\'/gm, '\"');
    // escape # (firefox stupidness)
    xmldata = xmldata.replace(/#/gm, '%23');


    return xmldata;
}

/**
 * get data uri value for `url(...)` declaration
 * for other values return value
 *
 * @param {string} value
 *
 * @return {string}
 */
function getDataUri(value,cwd){
    var match = value.match(/\s*url\((.+)\)[^\)]*$/);
    var uri = '';
    // no url value
    if (!match) {
        return value;
    } else {
        uri = match[1].replace(/^[\'\"]/,'').replace(/[\'\"]$/,'');
    }

    // got inlined svg, remove unecessary bytes to make it comparable
    if (/^data\:image\/svg\+xml/.test(uri)) {
        return cleanXMLData(uri);
    }

    // already base64 data uri
    if (/^data\:/.test(uri)) {
        return uri;
    }

    // file, try to convert
    var filepath = path.resolve(path.join(cwd, uri));
    var mimeType = mime.lookup(filepath);
    if(mimeType === "image/svg+xml") {
        return 'data:' + mimeType + ';utf-8,' + cleanXMLData(read(filepath, "utf-8"));
    } else {
        return 'data:' + mimeType + ';base64,' + read(filepath).toString('base64');
    }



}

/**
 * Compare two declarations for semantically equality
 * will return true for filepath compared to it's inline version
 *
 * @param decl1
 * @param decl2
 * @param options
 *
 * @return {bool}
 */
function isSemanticallyEqual(decl1, decl2, options) {
    if (!decl1.hasOwnProperty('type') || decl1.type !== 'declaration') {
        return;
    }
    if (!decl2.hasOwnProperty('type') || decl2.type !== 'declaration') {
        return;
    }

    // check basic equality
    if (decl1.property === decl2.property && decl1.value === decl2.value) {
        return true;

    // check data uris if applicable
    } else if (decl1.property === decl2.property && /\s*url\(/.test(decl1.value) && /\s*url\(/.test(decl2.value)) {
        var d1 = getDataUri(decl1.value,options.cwd);
        var d2 = getDataUri(decl2.value,options.cwd);

        return  d1 === d2;
    }

    // not equal
    return false;
}

/**
 * Generate function that returns declarations for selector which are not in the compare stylesheet
 * The function returns all declarations for the passed in key.
 * Only the declarations where property name and value are equal will be returned
 *
 * @param compare
 * @returns {Function}
 */
function getDeclarationDiffFunction(compare, options) {
    return function (key, declarations) {
        if (!compare.hasOwnProperty(key)) {
            return declarations;
        }

        // return all declarations which are not inside compare
        return _.chain(declarations)
            .filter(function (declaration) {
                var found = _.find(compare[key], function (decl) {
                    // check inlined images
                    if (options.strict) {
                        return decl.property === declaration.property && decl.value === declaration.value;
                    } else {
                        return isSemanticallyEqual(decl, declaration, options);
                    }
                });

                return !found || found.type !== 'declaration';

            }).value();
    };
}

/**
 * Creates function to compare complete rule declaration with `compareFunc`
 * The returned function returns an array with all selectors for this rule which have remaining style
 * declarations to keep in the resulting css. These selectors are grouped by the declarations they should keep.
 * This functionality is needed to split up rules with multiple selectors in multiple rules if applicable
 *
 * @example
 *
 * // stylesheet a
 * html,
 * body,
 * div {
 *    margin: 0,
 *    padding: 0
 * }
 *
 * // stylesheet b
 * html {
 *    padding: 0
 * }
 *
 * // result
 * [{selectors: ['body','div'], declarations: {margin:0, padding:0}},{ selectors: ['html'], declarations: {margin:0} }]
 *
 * @param compareFunc
 * @returns {Function}
 */
function getGroupedDeclarationDiffFunction(compareFunc) {

    return function (rule) {
        // get prefix
        var prefix = getPrefix(rule);
        return _.chain(rule.selectors)
            // compare each selector and create a hash for the declaration object
            .reduce(function (result, selector) {
                var declarations = compareFunc(prefix + selector, rule.declarations);
                result.push({
                    selector: selector,
                    declarations: declarations,
                    hash: hash(_.clone(declarations))
                });
                return result;

                // strip of selectors with no remaining declarations
            }, []).filter(function (entry) {
                return !!entry.declarations.length;

                // group by declaration hash
            }).groupBy(function (entry) {
                return entry.hash;

                // pack everything together
            }).reduce(function (result, group) {
                result.push({
                    declarations: _.first(group).declarations,
                    selectors: _.reduce(group, function (result, entry) {
                        result.push(entry.selector);
                        return result;
                    }, [])
                });
                return result;
                // finally stripm groups where only comments left
            }, []).filter(function (group) {
                return !!_.filter(group.declarations, function (decl) {
                    return decl.type !== 'comment';
                }).length;
            }).value();
    };
}

/**
 * Compare rules of main stylesheet with generated compare structure and compute difference stylesheet
 * Performs a non-destructive compare so all rules it can't handle will not be removed.
 *
 * @param rules
 * @param interectionKeys
 * @param groupFunc
 * @returns {array} rules
 */
function compareRules(rules, interectionKeys, groupFunc) {
    return _.chain(rules)
        .reduce(function (result, rule) {
            var prefix = getPrefix(rule);
            var selectors = _.map(rule.selectors || [], function (selector) {
                return prefix + selector;
            });

            // first check if there is an intersection at selector level
            var intersection = !!_.intersection(interectionKeys, selectors).length;
            // rule with no intersection at selector level
            var ruleTest = rule.type === 'rule' && !intersection;
            // unsuppored rules -> keep as they are
            var unsupportedRule = rule.type !== 'rule' && !rule.hasOwnProperty('rules');

            // no intersection between main stylesheet and compare stylesheet or an unsupported rule type found
            // just add to result set
            if (ruleTest || unsupportedRule) {
                result.push(rule);

                // rule has child rules -> recursive call to compute child node diff
            } else if (rule.hasOwnProperty('rules')) {
                rule.rules = compareRules(rule.rules, interectionKeys, groupFunc);
                // filter slectors where only a comment is left over
                if (_.filter(rule.rules, function (rule) {
                    return rule.type !== 'comment';
                }).length) {
                    result.push(rule);
                }
                // intersections found
            } else {
                // compute grouped diff
                var groupedDiffDeclarations = groupFunc(rule);
                // add one rule for each group and append it to result
                _.forEach(groupedDiffDeclarations, function (group) {
                    var clone = _.cloneDeep(rule);
                    clone.selectors = group.selectors;
                    clone.declarations = group.declarations;
                    result.push(clone);
                });
            }

            return result;
        }, [])
        .value();
}

/**
 * Build compare structure
 * @param rules
 * @returns {object}
 */
function buildCompare(rules) {
    return _.chain(rules)
        // filter relevant rules
        .filter(function (rule) {
            return rule.type && rule.type === 'rule' || rule.hasOwnProperty('rules');
        })
        .reduce(function (result, rule) {
            // we're on a leaf, collect declarations for this selector
            if (rule.type === 'rule') {
                var prefix = getPrefix(rule);
                var declarations = _.chain(rule.declarations)
                    .filter(function (declaration) {
                        return declaration.type === 'declaration';
                    })
                    .value();

                _.forEach(rule.selectors, function (selector) {
                    result[prefix + selector] = (result[prefix + selector] || []).concat(declarations);
                });
                // rule has child rules (e.g. rule is media query)
            } else if (rule.hasOwnProperty('rules')) {
                // get compare structure for nore rules
                var rules = buildCompare(rule.rules);
                // flatten the structure
                result = _.reduce(rules, function (res, declarations, key) {
                    res[key] = _.uniq((res[key] || []).concat(declarations));
                    return res;
                }, result);
            }

            return result;
        }, {}).value();
}

/**
 * compare multiple stylesheet strings and generate diff.
 * Diff consists of all css rules in first stylesheet which do not exist in any other stylesheet
 *
 * @param {string} mainCss Main stylesheet
 * @param {string} compareCss Stylesheet to compare
 * @param {object} options Options object
 * @param {function} cb Callback function
 */
function stylediff(mainCss, compareCss, options, cb) {
    // optional options array -> set callback
    if (_.isFunction(options)) {
        cb = options;
        options = opts;
    } else {
        options = _.defaults(options,opts);
    }


    try {
        // run through clean css to optimize css and to make it better comparable
        var clean = new CleanCSS({
            keepBreaks: true,
            processImport: false,
            noRebase: true
        });


        // parse stylesheets
        var main = css.parse(clean.minify(mainCss));
        var compare = css.parse(clean.minify(compareCss));

        // build compare structure
        var compareSelectors = buildCompare(compare.stylesheet.rules);
        // generate selectors array for first intersection check
        var compareSelectorKeys = _.keys(compareSelectors);
        // generate function to compute grouped diff for rule
        var getGroupedDiffDeclarations = getGroupedDeclarationDiffFunction(getDeclarationDiffFunction(compareSelectors, options));

        // lets do the work
        main.stylesheet.rules = compareRules(main.stylesheet.rules, compareSelectorKeys, getGroupedDiffDeclarations);

        var out = css.stringify(main);
        cb(null, out);

    } catch (err) {
        cb(err);
    }
}


module.exports = stylediff;
