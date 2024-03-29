import {Component, ElementRef, Input, Output, EventEmitter, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {ECLExpression, SubAttributeSet, Attribute} from '../models/ecl';
import {catchError, debounceTime, distinctUntilChanged, filter, switchMap, tap} from 'rxjs/operators';
import {Observable, Subscription} from 'rxjs';
import {HttpService} from '../services/http.service';
import {EclService} from '../services/ecl.service';

@Component({
    selector: 'app-ecl-builder',
    templateUrl: './ecl-builder.component.html',
    styleUrls: ['./ecl-builder.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class EclBuilderComponent implements OnInit, OnDestroy {

    element: any;
    @Input() apiUrl: string;
    @Input() branch: string;
    @Output() output = new EventEmitter();

    refinementActive = false;
    attributes: any[];
    spinner = document.createElement('div');

    eclObject: any;
    eclObjectSubscription: Subscription;
    @Input() eclString: string;
    eclStringSubscription: Subscription;

    constructor(private el: ElementRef, private httpService: HttpService, private eclService: EclService) {
        this.element = el.nativeElement;
        this.eclObjectSubscription = this.eclService.getEclObject().subscribe(data => this.eclObject = data);
        this.eclStringSubscription = this.eclService.getEclString().subscribe(data => this.eclString = data);
        this.spinner.id = 'spinner';
        this.spinner.classList.add('ecl-spinner', 'spinner-border-sm', 'position-absolute');
        this.spinner.style.top = '7px';
        this.spinner.style.right = '7px';
    }

    ngOnInit(): void {
        document.body.appendChild(this.element);
        this.element.addEventListener('click', el => {
            if (el.target.className === 'app-modal') {
                this.close();
            }
        });

        if (this.eclString) {
            this.eclService.setEclString(this.eclString);

            this.httpService.getStringToModel(this.apiUrl, this.eclString).subscribe((dataObject: any) => {
                this.eclService.setEclObject(dataObject);
                this.updateExpression();
            });
        } else {
            this.clear();
        }

        this.httpService.getAttributes(this.apiUrl, this.branch).subscribe(data => {
            this.attributes = data.items;
        });
    }



    ngOnDestroy(): void {
        this.element.remove();
    }

    isMemberOf(operator): boolean {
        return operator === 'memberOf';
    }

    getConceptId(eclObject): void {
        if (eclObject) {
            if (eclObject.fullTerm === '*') {
                eclObject.wildcard = true;
                delete eclObject.conceptId;
                delete eclObject.term;
            } else {
                eclObject.wildcard = false;
                eclObject.conceptId = eclObject.fullTerm.slice(0, (eclObject.fullTerm.indexOf('|') - 1));
                eclObject.term = eclObject.fullTerm.slice(eclObject.fullTerm.indexOf('|') + 1, eclObject.fullTerm.lastIndexOf('|'));
            }
        }

        // this.updateExpression();
    }

    updateExpression(): void {
        if (!this.refinementActive) {
            this.refinementActive = true;
        }

        const eclObject = this.cloneObject(this.eclObject);

        this.httpService.getModelToString(this.apiUrl, eclObject).pipe(debounceTime(500)).subscribe((dataString: string) => {
            this.eclService.setEclString(dataString);
        });
    }

    setupConcrete(name): void {
        if (this.isConcreteDomain(name)) {
            if (this.eclObject.eclRefinement) {
                if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.subAttributeSet.attribute.value) {
                    delete this.eclObject.eclRefinement.subRefinement.eclAttributeSet.subAttributeSet.attribute.value;
                }

                if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.subAttributeSet.attribute.expressionComparisonOperator) {
                    delete this.eclObject.eclRefinement.subRefinement.eclAttributeSet.subAttributeSet.attribute.expressionComparisonOperator;
                }

                if (!this.eclObject.eclRefinement.subRefinement.eclAttributeSet.subAttributeSet.attribute.numericComparisonOperator) {
                    this.eclObject.eclRefinement.subRefinement.eclAttributeSet.subAttributeSet.attribute.numericComparisonOperator = '=';
                }

                if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet) {
                    this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet.forEach(conj => {
                        if (this.isConcreteDomain(name)) {
                            if (conj.attribute.value) {
                                delete conj.attribute.value;
                            }

                            if (conj.attribute.expressionComparisonOperator) {
                                delete conj.attribute.expressionComparisonOperator;
                            }

                            if (!conj.attribute.numericComparisonOperator) {
                                conj.attribute.numericComparisonOperator = '=';
                            }
                        }

                    });
                } else if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet) {
                    this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet.forEach(disj => {
                        if (this.isConcreteDomain(name)) {
                            if (disj.attribute.value) {
                                delete disj.attribute.value;
                            }

                            if (disj.attribute.expressionComparisonOperator) {
                                delete disj.attribute.expressionComparisonOperator;
                            }

                            if (!disj.attribute.numericComparisonOperator) {
                                disj.attribute.numericComparisonOperator = '=';
                            }
                        }

                    });
                }
            }
        }
    }

    isConcreteDomain(id): boolean {
        if (this.attributes) {
            return this.attributes.find(attribute => String(this.getIdFromShortConcept(id)) === attribute.id);
        }
    }

    getIdFromShortConcept(input): string {
        if (input) {
            return input.replace(/\D/g, '');
        }
    }

    close(): void {
        document.getElementById('ecl-builder').remove();
    }

    accept(): void {
        this.httpService.getModelToString(this.apiUrl, this.eclObject).subscribe((dataString: string) => {
            this.output.emit(dataString);
            document.getElementById('ecl-builder').remove();
        });
        document.getElementById('ecl-builder').hidden = true;
    }

    newFocusConceptRow(): void {
        if (this.eclObject.fullTerm) {
            this.convertExpressionToConjunction();
        }

        if (this.eclObject.conjunctionExpressionConstraints) {
            this.eclObject.conjunctionExpressionConstraints.push(new ECLExpression());
            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        } else if (this.eclObject.disjunctionExpressionConstraints) {
            this.eclObject.disjunctionExpressionConstraints.push(new ECLExpression());
            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        }
    }

    removeFocusConceptRow(index): void {
        if (this.eclObject.conjunctionExpressionConstraints) {
            this.eclObject.conjunctionExpressionConstraints.splice(index, 1);
            if (this.eclObject.conjunctionExpressionConstraints.length === 1) {
                this.eclService.setEclObject(this.eclObject.conjunctionExpressionConstraints[0]);
            } else {
                this.eclService.setEclObject(this.eclObject);
            }
        } else if (this.eclObject.disjunctionExpressionConstraints) {
            this.eclObject.disjunctionExpressionConstraints.splice(index, 1);
            if (this.eclObject.disjunctionExpressionConstraints.length === 1) {
                this.eclService.setEclObject(this.eclObject.disjunctionExpressionConstraints[0]);
            } else {
                this.eclService.setEclObject(this.eclObject);
            }
        }
        this.updateExpression();
    }

    newAttributeGroup(): void {
        if (this.eclObject.fullTerm) {
            const refinement = this.eclService.convertExpressionToRefinement(this.eclObject);
            this.eclService.setEclObject(refinement);
            this.updateExpression();
        }
    }

    newAttributeGroupRow(): void {
        if (!this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet &&
            !this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet) {
            const conjunction = this.eclService.convertRefinementToConjunction(this.eclObject);
            this.eclService.setEclObject(conjunction);
            this.updateExpression();
        } else if (!this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet &&
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet) {
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet.push(new SubAttributeSet(new Attribute(
                new ECLExpression(),
                '=',
                new ECLExpression(),
                false,
                1
            )));
            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        } else if (!this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet &&
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet) {
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet.push(new SubAttributeSet(new Attribute(
                new ECLExpression(),
                '=',
                new ECLExpression(),
                false,
                1
            )));
            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        }
    }

    removeAttributeGroupRow(type?, index?): void {
        if (!this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet &&
            !this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet) {
            const expression = this.eclService.convertRefinementToExpression(this.eclObject);
            this.eclService.setEclObject(expression);
            this.updateExpression();
        }
        if (type === 'conjunction') {
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet.splice(index, 1);
            if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet.length === 0) {
                delete this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet;
            }
            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        }
        if (type === 'disjunction') {
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet.splice(index, 1);
            if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet.length === 0) {
                delete this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet;
            }
            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        }
    }

    convertExpressionToConjunction(): void {
        if (this.eclObject.fullTerm) {
            const conjunction = this.eclService.convertExpressionToConjunction(this.eclObject);
            this.eclService.setEclObject(conjunction);
            this.updateExpression();
        }
    }

    convertConjunctionToDisjunction(): void {
        if (this.eclObject.conjunctionExpressionConstraints) {
            const disjunction = this.eclService.convertConjunctionToDisjunction(this.eclObject);
            this.eclService.setEclObject(disjunction);
            this.updateExpression();
        }
    }

    convertDisjunctionToConjunction(): void {
        if (this.eclObject.disjunctionExpressionConstraints) {
            const conjunction = this.eclService.convertDisjunctionToConjunction(this.eclObject);
            this.eclService.setEclObject(conjunction);
            this.updateExpression();
        }
    }

    convertConjunctionRefinementToDisjunctionRefinement(): void {
        if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet) {
            const conjunctionRefinement = this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet;
            delete this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet;
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet = conjunctionRefinement;

            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        }
    }

    convertDisjunctionRefinementToConjunctionRefinement(): void {
        if (this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet) {
            const disjunctionRefinement = this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet;
            delete this.eclObject.eclRefinement.subRefinement.eclAttributeSet.disjunctionAttributeSet;
            this.eclObject.eclRefinement.subRefinement.eclAttributeSet.conjunctionAttributeSet = disjunctionRefinement;

            this.eclService.setEclObject(this.eclObject);
            this.updateExpression();
        }
    }

    clear(): void {
        this.eclService.setEclObject(new ECLExpression('descendantorselfof', '', false, '', ''));
        this.eclService.setEclString('');
    }



    getOpSymbol(operator): string {
        if (operator) {
            switch (operator) {
                case 'self': return '';
                case 'descendantof': return '<';
                case 'descendantorselfof': return '<<';
                case 'childof': return '<!';
                case 'ancestorof': return '>';
                case 'ancestororselfof': return '>>';
                case 'parentof': return '>!';
                case 'memberOf': return '^';
            }
        } else {
            return '';
        }
    }

    cloneObject(object): any {
        return JSON.parse(JSON.stringify(object));
    }
}
