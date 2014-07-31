'use strict';

var _ = require('lodash'),
    hash = require('es-hash'),
    css = require('css'),
    opts = {};



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
 * Generate function that returns declarations for selector which are not in the compare stylesheet
 * The function returns all declarations for the passed in key.
 * Only the declarations where property name and value are equal will be returned
 *
 * @param compare
 * @returns {Function}
 */
function getDeclarationDiffFunction(compare) {
    return function(key,declarations) {
        if (!compare.hasOwnProperty(key)) {
            return declarations;
        }

        // return all declarations which are not inside compare
        return _.chain(declarations)
            .filter(function(declaration){
                var found =  _.find(compare[key],function(decl){
                    return decl.property === declaration.property && decl.value === declaration.value;
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
            .reduce(function(result,selector){
                var declarations = compareFunc(prefix+selector,rule.declarations);
                result.push({
                    selector: selector,
                    declarations: declarations,
                    hash: hash(_.clone(declarations))
                });
                return result;

            // strip of selectors with no remaining declarations
            },[]).filter(function(entry) {
                return !!entry.declarations.length;

            // group by declaration hash
            }).groupBy(function(entry){
                return entry.hash;

            // pack everything together
            }).reduce(function(result,group) {
                result.push({
                    declarations: _.first(group).declarations,
                    selectors: _.reduce(group,function(result,entry){
                        result.push(entry.selector);
                        return result;
                    },[])
                });
                return result;
            // finally stripm groups where only comments left
            },[]).filter(function(group){
                return !!_.filter(group.declarations,function(decl){
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
            var selectors = _.map(rule.selectors || [],function(selector){
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
                rule.rules = compareRules(rule.rules,interectionKeys,groupFunc);
                // filter slectors where only a comment is left over
                if (_.filter(rule.rules,function(rule){ return rule.type !== 'comment';}).length) {
                    result.push(rule);
                }
            // intersections found
            } else {
                // compute grouped diff
                var groupedDiffDeclarations = groupFunc(rule);
                // add one rule for each group and append it to result
                _.forEach(groupedDiffDeclarations,function(group){
                    var clone = _.cloneDeep(rule);
                    clone.selectors = group.selectors;
                    clone.declarations = group.declarations;
                    result.push(clone);
                });
            }

            return result;
        },[])
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
        .reduce(function(result, rule) {
            // we're on a leaf, collect declarations for this selector
            if (rule.type === 'rule') {
                var prefix = getPrefix(rule);
                var declarations = _.chain(rule.declarations)
                    .filter(function(declaration) {
                        return declaration.type === 'declaration';
                    })
                    .value();

                _.forEach(rule.selectors,function(selector){
                    result[prefix+selector] = (result[prefix+selector] || []).concat(declarations);
                });
            // rule has child rules (e.g. rule is media query)
            } else if (rule.hasOwnProperty('rules')) {
                // get compare structure for nore rules
                var rules = buildCompare(rule.rules);
                // flatten the structure
                result = _.reduce(rules,function(res,declarations,key) {
                    res[key] = _.uniq((res[key] || []).concat(declarations));
                    return res;
                },result);
            }

            return result;
        },{}).value();
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
    } else {
        opts = _.defaults(opts,options);
    }

    // parse stylesheets
    try {
        var main = css.parse(mainCss);
        var compare = css.parse(compareCss);

        // build compare structure
        var compareSelectors = buildCompare(compare.stylesheet.rules);
        // generate selectors array for first intersection check
        var compareSelectorKeys = _.keys(compareSelectors);
        // generate function to compute grouped diff for rule
        var getGroupedDiffDeclarations = getGroupedDeclarationDiffFunction(getDeclarationDiffFunction(compareSelectors));

        // lets do the work
        main.stylesheet.rules = compareRules(main.stylesheet.rules, compareSelectorKeys, getGroupedDiffDeclarations);

        var out = css.stringify(main);
        cb(null, out);

    } catch (err) {
        cb(err);
    }
}


module.exports = stylediff;
