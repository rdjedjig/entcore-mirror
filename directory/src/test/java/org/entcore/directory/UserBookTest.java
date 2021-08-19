package org.entcore.directory;

import io.vertx.core.json.JsonArray;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.ext.unit.Async;
import io.vertx.ext.unit.TestContext;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.neo4j.Neo;
import org.entcore.common.notification.NotificationUtils;
import org.entcore.common.user.UserInfos;
import org.entcore.directory.controllers.UserBookController;
import org.entcore.test.TestHelper;
import org.junit.BeforeClass;
import org.junit.ClassRule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.testcontainers.containers.Neo4jContainer;

@RunWith(VertxUnitRunner.class)
public class UserBookTest {
    private static Logger logger = LoggerFactory.getLogger(UserBookTest.class);
    private static final TestHelper test = TestHelper.helper();
    private static UserInfos user = test.directory().generateUser("user1");
    private static UserBookController userBookController=new UserBookController();
    @ClassRule
    public static Neo4jContainer<?> neo4jContainer = test.database().createNeo4jContainer();

    @BeforeClass
    public static void setUp(TestContext context) throws Exception {
        userBookController.setNeo(new Neo(test.vertx(), test.vertx().eventBus(), logger));
        test.database().initNeo4j(context, neo4jContainer);
        test.userbook().createMock(mess->{
            userBookController.getUserPreferences(mess);
        });
        test.directory().createActiveUser(user).onComplete(context.asyncAssertSuccess());
    }

    @Test
    public void testShouldFetchFCMTokenWithoutCache(final TestContext context) throws Exception {
        final JsonArray ids = new JsonArray().add("id1");
        final Async async = context.async();
        NotificationUtils.getUsersFcmToken(test.vertx().eventBus(), ids, e->{
            context.assertEquals(1, e.size());
            async.complete();
        });
    }
}
