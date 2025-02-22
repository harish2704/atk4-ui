<?php

declare(strict_types=1);

namespace Atk4\Ui\Tests;

use Atk4\Core\Phpunit\TestCase;
use Atk4\Ui\Exception;
use Atk4\Ui\Table;
use PHPUnit\Framework\Attributes\DoesNotPerformAssertions;

class TableTest extends TestCase
{
    use CreateAppTrait;

    /**
     * @doesNotPerformAssertions
     */
    #[DoesNotPerformAssertions]
    public function testAddColumnWithoutModel(): void
    {
        $table = new Table();
        $table->setApp($this->createApp());
        $table->invokeInit();
        $table->setSource([
            ['one' => 1, 'two' => 2, 'three' => 3, 'four' => 4],
            ['one' => 11, 'two' => 12, 'three' => 13, 'four' => 14],
        ]);

        // 4 ways to add column
        $table->addColumn(null, new Table\Column\Link('test.php?id=1'));

        // multiple ways to add column which doesn't exist in model
        $table->addColumn('five', new Table\Column\Link('test.php?id=1'));
        $table->addColumn('seven', [Table\Column\Link::class]);
        $table->addColumn('eight', [Table\Column\Link::class, ['id' => 3]]);
        $table->addColumn('nine');

        $table->renderToHtml();
    }

    public function testAddColumnAlreadyExistsException(): void
    {
        $table = new Table();
        $table->setApp($this->createApp());
        $table->invokeInit();
        $table->addColumn('foo');

        $this->expectException(Exception::class);
        $this->expectExceptionMessage('Table column already exists');
        $table->addColumn('foo');
    }
}
