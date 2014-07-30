var _ = require('lodash'),
    hash = require('es-hash'),
    css = require('css');


function getPrefix(rule) {
    if (!rule.parent || rule.parent === 'stylesheet') {
        return ''
    }

    var prefixes = [];

    if (rule.type !== 'rule') {
        prefixes.push(rule.type);
    }


    prefixes.push(rule.type)
    var type = rule.parent.type;

    return

    return rule.parent && rule.parent.type === 'media' ? rule.parent.media + '-' : '';
}

/**
 * Generate function that returns declarations for selector which are not in the compare stylesheet
 *
 * @param compare
 * @returns {Function}
 */
function getDeclarationDiffFunction(compare) {
    return function(selector,declarations) {
        if (!compare.hasOwnProperty(selector)) {
            return declarations;
        }

        return _.chain(declarations)
            .filter(function(declaration){
                return !compare[selector].hasOwnProperty(declaration.property);
            }).value();
    }
}

function getGroupedDeclarationDiffFunction(compareFunc) {
    return function (rule) {
        var prefix = getPrefix(rule);
        var tmp = _.chain(rule.selectors).reduce(function(result,selector){
            var declarations = compareFunc(prefix+selector,rule.declarations);
            result.push({
                selector: selector,
                declarations: declarations,
                hash: hash(_.clone(declarations))
            });
            return result;
        },[]).filter(function(entry) {
            return !!entry.declarations.length
        }).groupBy(function(entry){
            return entry.hash;
        }).reduce(function(result,group) {
            result.push({
                declarations: _.first(group).declarations,
                selectors: _.reduce(group,function(result,entry){
                    result.push(entry.selector);
                    return result;
                },[])
            });
            return result;
        },[]).value();

        return tmp;
    }
}


function buildCompare(rules) {
    return _.chain(rules)
//        .filter(function (rule) {
//            return rule.type && rule.type === 'rule';
//        })
        .reduce(function(result, rule) {
            var prefix = getPrefix(rule);
            var declarations = _.chain(rule.declarations)
                .filter(function(declaration) {
                    return declaration.type === 'declaration';
                })
                .reduce(function(result, declaration) {
                    result[declaration.property] = declaration.value;
                    return result;
                },{})
                .value();

            _.forEach(rule.selectors,function(selector) {
                result[prefix+selector] = _.assign(result[prefix+selector] || {}, declarations);
            });

            return result;
        },{}).value();
}


/**
 * compare multiple stylesheet strings and generate diff.
 * Diff consists of all css rules in first stylesheet which do not exist in any other stylesheet
 */
function cssdiff() {

    var args = Array.prototype.slice.call(arguments);
        mainCss = args.shift();

    // return main css if there is nothing to compare with
    if (!args.length) {
        return mainCss;
    }

    var main = css.parse(mainCss);
    var compare = css.parse(args.shift());


    var compareSelectors =




    var compareSelectorKeys = _.keys(compareSelectors);
    var getGroupedDiffDeclarations = getGroupedDeclarationDiffFunction(getDeclarationDiffFunction(compareSelectors));

    main.stylesheet.rules = _.chain(main.stylesheet.rules)
        .reduce(function (result, rule) {
            // intersect with empty array when there is no selector e.g. for rule.type === 'comment'
            var intersection = _.intersection(compareSelectorKeys,rule.selectors || []);

            // no intersection between main stylesheet and compare stylesheet
            if (rule.type !== 'rule' || !intersection.length) {
                result.push(rule);

            // intersections found
            } else {
                var groupedDiffDeclarations = getGroupedDiffDeclarations(rule);

                _.forEach(groupedDiffDeclarations,function(group){
                    var clone = _.cloneDeep(rule);
                    clone.selectors = group.selectors;
                    clone.declarations = group.declarations;
                    result.push(clone)
                });
            }

            return result;
        },[])
        .uniq()
        .value();


    return css.stringify(main);


}


module.exports = cssdiff;
