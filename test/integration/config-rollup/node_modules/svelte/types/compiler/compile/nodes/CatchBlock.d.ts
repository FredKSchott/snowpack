import TemplateScope from './shared/TemplateScope';
import AbstractBlock from './shared/AbstractBlock';
export default class CatchBlock extends AbstractBlock {
    type: 'CatchBlock';
    scope: TemplateScope;
    constructor(component: any, parent: any, scope: any, info: any);
}
