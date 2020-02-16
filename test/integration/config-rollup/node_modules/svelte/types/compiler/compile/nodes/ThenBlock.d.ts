import TemplateScope from './shared/TemplateScope';
import AbstractBlock from './shared/AbstractBlock';
export default class ThenBlock extends AbstractBlock {
    type: 'ThenBlock';
    scope: TemplateScope;
    constructor(component: any, parent: any, scope: any, info: any);
}
